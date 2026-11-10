import { isIP } from 'node:net'
import { T, utils } from '@start9labs/start-sdk'
import { socksHostId, socksPort } from 'tor-startos/startos/utils'
import { samHostId, samPort } from 'i2pd-startos/startos/utils'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { NodeConfig } from './fileModels/rbitcoin.conf'
import { Store } from './fileModels/store.json'
import { ports } from './utils'

export function peerPublication(effects: T.Effects) {
  return sdk.host.getOwn(effects, 'peer', (host) => {
    if (!host)
      return { ips: [] as string[], incompatiblePort: false, onion: false }
    const addresses = utils.filledAddress(host, {
      hostId: 'peer',
      internalPort: ports.peer,
      username: null,
      scheme: null,
      sslScheme: null,
      suffix: '',
    }).public
    const ips = addresses.filter({ kind: 'ip' }).format('hostname-info')
    return {
      ips: [
        ...new Set(
          ips
            .filter((a) => a.port === ports.peer && !a.ssl)
            .map((a) => a.hostname),
        ),
      ].sort(),
      incompatiblePort: ips.some((a) => a.port !== ports.peer || a.ssl),
      onion: addresses
        .filter({ pluginId: 'tor' })
        .format('hostname-info')
        .some((a) => a.hostname.endsWith('.onion')),
    }
  })
}

function manualPeer(value: string) {
  const match = /^(?:\[([^\]]+)\]|([^:\s/]+)):([0-9]+)$/.exec(value)
  if (!match || +match[3] < 1 || +match[3] > 65535)
    throw new Error(
      i18n(
        'Enter a peer as host:port or [IPv6]:port, without a protocol scheme.',
      ),
    )
  const host = (match[1] || match[2]).toLowerCase()
  const ip = isIP(host)
  if (match[1] && ip !== 6)
    throw new Error(
      i18n(
        'Enter a peer as host:port or [IPv6]:port, without a protocol scheme.',
      ),
    )
  if (!ip && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host))
    throw new Error(
      i18n(
        'Enter a peer as host:port or [IPv6]:port, without a protocol scheme.',
      ),
    )
  if (host.endsWith('.onion') && !/^[a-z2-7]{56}\.onion$/.test(host))
    throw new Error(i18n('Use a valid v3 onion address for this peer.'))
  if (host.endsWith('.i2p') && !/^[a-z2-7]{52}\.b32\.i2p$/.test(host))
    throw new Error(i18n('Use a valid .b32.i2p address for this peer.'))
  return { host, ip }
}

function localPeer(host: string, ip: number) {
  if (ip === 4) {
    const [a, b] = host.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  // Public IPv6 unicast is 2000::/3; this also excludes IPv4-mapped loopback/LAN.
  if (ip === 6) return !/^[23][0-9a-f]{0,3}:/.test(host)
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.home.arpa')
  )
}

export function validateNetworkSettings(config: NodeConfig, prefs: Store) {
  if (
    config.only_net.includes('i2p') &&
    (prefs.outgoingRouting === 'tor' || !prefs.i2pEnabled)
  )
    throw new Error(
      i18n(
        'I2P automatic peers require I2P connections in Standard mode. Change Automatic peer networks first.',
      ),
    )
  for (const value of config.connect) {
    const { host, ip } = manualPeer(value)
    if (ip === 6 && host.startsWith('fc'))
      throw new Error(i18n('CJDNS peers are not supported by this package.'))
    if (
      host.endsWith('.i2p') &&
      (prefs.outgoingRouting === 'tor' || !prefs.i2pEnabled)
    )
      throw new Error(
        i18n('Manual I2P peers require I2P connections in Standard mode.'),
      )
    if (prefs.outgoingRouting === 'tor' && localPeer(host, ip))
      throw new Error(
        i18n(
          'Local peers require Standard routing. Through Tor has no direct local-network exception.',
        ),
      )
  }
}

export function managedNetworkConfig(
  config: NodeConfig,
  prefs: Store,
  torAddress: string,
  samAddress: string | null,
  publishedIps: string[],
) {
  const i2p =
    prefs.outgoingRouting === 'standard' && prefs.i2pEnabled ? samAddress : null
  const selected = config.only_net.length
    ? config.only_net
    : ['ipv4', 'ipv6', 'onion', 'i2p']
  const effective = selected.filter((n) => n !== 'i2p' || i2p !== null)
  const blocked =
    effective.length === 0 ||
    (config.connect.length > 0 &&
      config.connect.every((p) =>
        p.toLowerCase().split(':')[0].endsWith('.i2p'),
      ) &&
      i2p === null)
  return {
    blocked,
    config: {
      connect: config.connect.map((p) => p.trim().toLowerCase()),
      listen: prefs.acceptIncomingPeers ? `[::]:${ports.peer}` : '0',
      proxy: prefs.outgoingRouting === 'tor' ? torAddress : null,
      onion: torAddress,
      proxy_randomize: true,
      only_net: effective,
      i2p_sam: i2p,
      i2p_accept_incoming: false,
      cjdns_reachable: false,
      no_discover: false,
      external_ip:
        prefs.acceptIncomingPeers && config.max_inbound > 0 ? publishedIps : [],
      seed_node: [],
      no_seeds: false,
      listen_onion: false,
    },
  }
}

export async function resolveNetworking(
  effects: T.Effects,
  config: NodeConfig,
  prefs: Store,
) {
  validateNetworkSettings(config, prefs)
  const torAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'tor',
      hostId: socksHostId,
      internalPort: socksPort,
      fallbackPort: socksPort,
    })
    .const()
  const samAddress =
    prefs.outgoingRouting === 'standard' && prefs.i2pEnabled
      ? await utils.Watchable.combine(
          effects,
          [
            sdk.getStatus(effects, { packageId: 'i2pd' }),
            sdk.host.getBridgeAddress(effects, {
              packageId: 'i2pd',
              hostId: samHostId,
              internalPort: samPort,
            }),
          ],
          ([status, address]) =>
            status?.desired.main === 'running' &&
            status.health.i2pd?.result === 'success'
              ? address
              : null,
        ).const()
      : null
  // Only actual advertised IPs restart main; onion or unrelated binding churn does not.
  const published =
    prefs.acceptIncomingPeers && config.max_inbound > 0
      ? await utils.Watchable.combine(
          effects,
          [peerPublication(effects)],
          ([p]) => p.ips,
        ).const()
      : []
  return {
    ...managedNetworkConfig(config, prefs, torAddress, samAddress, published),
    i2pAvailable: samAddress !== null,
  }
}
