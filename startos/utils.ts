import * as fs from 'node:fs/promises'
import { isIP } from 'node:net'
import { sdk } from './sdk'
import { i18n } from './i18n'
import {
  NodeConfig,
  configShape,
  serializeConfig,
} from './fileModels/rbitcoin.conf'
import { Store } from './fileModels/store.json'

export const ports = {
  peer: 8333,
  rpc: 8332,
  electrum: 50001,
  esplora: 3000,
  health: 9332,
  sv2: 8442,
}

export function endpointInput(name: string) {
  return sdk.Value.union({
    name,
    default: 'disabled',
    variants: sdk.Variants.of({
      disabled: { name: i18n('Disabled'), spec: sdk.InputSpec.of({}) },
      enabled: {
        name: i18n('Enabled'),
        spec: sdk.InputSpec.of({
          address: sdk.Value.text({
            name: i18n('Endpoint (IP:port)'),
            required: true,
            default: null,
            minLength: 1,
            masked: false,
          }),
        }),
      },
    }),
  })
}

export function endpointPrefill(address: string | null) {
  return address
    ? { selection: 'enabled' as const, value: { address } }
    : { selection: 'disabled' as const, value: {} }
}
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.stat(path)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return false
    throw error
  }
}

export function isSocket(value: string): boolean {
  const match = /^(?:\[([^\]]+)\]|([^:]+)):([0-9]+)$/.exec(value)
  return (
    !!match &&
    !!isIP(match[1] || match[2]) &&
    Number(match[3]) >= 1 &&
    Number(match[3]) <= 65535
  )
}

// Matches v0.9.0's parse_permission_flags, before validating the target below.
function permissionTarget(grant: string): string {
  const value = grant.trim()
  const at = value.indexOf('@')
  if (at < 0) return value
  let hasPermission = false
  let hasDirection = false
  for (const flag of value.slice(0, at).split(',')) {
    if (
      [
        'bloomfilter',
        'bloom',
        'noban',
        'forcerelay',
        'mempool',
        'download',
        'all',
        'relay',
        'addr',
      ].includes(flag)
    ) {
      hasPermission = true
    } else if (flag === 'in' || flag === 'out') {
      hasDirection = true
    } else if (flag !== '') {
      throw new Error(
        i18n('Invalid peer permission. Check the permission names.'),
      )
    }
  }
  if (hasDirection && !hasPermission)
    throw new Error(i18n('Add a permission alongside in or out.'))
  return value.slice(at + 1)
}

function isSubnet(value: string): boolean {
  const slash = value.lastIndexOf('/')
  const host = (slash < 0 ? value : value.slice(0, slash)).replace(
    /^[\[\]]+|[\[\]]+$/g,
    '',
  )
  const family = isIP(host)
  if (!family) return false
  if (slash < 0) return true
  const prefix = value.slice(slash + 1)
  return (
    /^\+?[0-9]+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128)
  )
}

export async function validateConfig(next: NodeConfig): Promise<void> {
  serializeConfig(next)
  if (!Number.isInteger(next.mempool_size_mb) || next.mempool_size_mb < 1)
    throw new Error(i18n('Mempool budget must be at least 1.'))
  for (const grant of next.net_permission) {
    if (grant.trim() && !isSubnet(permissionTarget(grant)))
      throw new Error(
        i18n('Use an IP address or CIDR range for peer permissions.'),
      )
  }
  if (next.prune_seqsigwit && next.sp_tweaks)
    throw new Error(i18n('Silent Payments requires unpruned data.'))
  if (
    (!next.prune_seqsigwit || next.sp_tweaks) &&
    (await exists(sdk.volumes.main.subpath('datadir/store/seqsigwit.prune')))
  )
    throw new Error(
      i18n('This store is pruned. Keep pruning on and Silent Payments off.'),
    )
  for (const value of [next.proxy, next.onion, next.i2p_sam]) {
    if (value !== null && !isSocket(value))
      throw new Error(
        i18n(
          'Proxy and SAM endpoints must be numeric IPv4:port or [IPv6]:port addresses.',
        ),
      )
  }
  if (next.only_net.includes('onion') && !next.proxy && !next.onion)
    throw new Error(i18n('Onion peers need a SOCKS5 proxy.'))
  if (next.only_net.includes('i2p') && !next.i2p_sam)
    throw new Error(i18n('I2P networking requires a SAM endpoint.'))
  if (next.only_net.includes('cjdns') && !next.cjdns_reachable)
    throw new Error(
      i18n('Enable CJDNS routing before selecting the CJDNS network.'),
    )
  if (
    next.only_net.some(
      (net) => !['ipv4', 'ipv6', 'onion', 'i2p', 'cjdns'].includes(net),
    )
  )
    throw new Error(
      i18n('Allowed networks are ipv4, ipv6, onion, i2p, and cjdns.'),
    )
  if (next.rest && !next.rpc_listen)
    throw new Error(
      i18n('Enable JSON-RPC over TCP before enabling Core-style REST.'),
    )
  if (next.esplora_block_template && !next.esplora_listen)
    throw new Error(i18n('Enable Esplora before serving its block templates.'))
  if (next.sv2_tp_listen && !next.sv2_tp_authority_sec)
    throw new Error(
      i18n(
        'Set a Stratum v2 authority secret before enabling the template provider.',
      ),
    )
  const secret = next.sv2_tp_authority_sec
  if (
    secret &&
    (!/^[0-9a-fA-F]{64}$/.test(secret) ||
      BigInt('0x' + secret) === 0n ||
      BigInt('0x' + secret) >=
        BigInt(
          '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
        ))
  )
    throw new Error(
      i18n('Enter a valid secp256k1 secret as 64 hex characters.'),
    )
  for (const fee of [next.min_relay_tx_fee, next.block_min_tx_fee]) {
    if (!/^(?:[0-9]+(?:\.[0-9]{1,8})?|\.[0-9]{1,8})$/.test(fee))
      throw new Error(
        i18n(
          'Fees must be nonnegative BTC per kvB with at most eight decimal places.',
        ),
      )
  }
}

export async function validatePerformance(
  next: Store,
  current: Store,
): Promise<void> {
  if (
    next.splitCold !== current.splitCold &&
    (await exists(sdk.volumes.main.subpath('datadir/store')))
  )
    throw new Error(
      i18n(
        'Cold-file placement cannot change after the data store is created.',
      ),
    )
}

export function processEnvironment(store: Store): Record<string, string> {
  const env: Record<string, string> = {}
  if (store.ioBackend !== 'auto') env.RBITCOIN_IO = store.ioBackend
  return env
}

export function runtimeConfig(config: NodeConfig): string {
  const supported = Object.fromEntries(
    Object.entries(config).filter(([key]) =>
      Object.hasOwn(configShape.shape, key),
    ),
  )
  return serializeConfig(configShape.parse(supported))
}

export function nodeArguments(config: NodeConfig, store: Store): string[] {
  const args = [
    '--conf',
    '/etc/rbitcoin.conf',
    '--network',
    'mainnet',
    '--datadir',
    '/data/datadir',
    '--health-listen',
    '0.0.0.0:9332',
  ]
  if (store.splitCold) args.push('--datadir-cold', '/cold')
  if (config.rpc_listen)
    args.push(
      '--rpc-token-file',
      '/data/datadir/rpc.token',
      '--rpc-cookie-file',
      '/data/datadir/rpc.cookie',
      '--rpc-cookie-perms',
      'owner',
    )
  return args
}

export function readinessMessage(body: string): string {
  const reason = body.trim().replace(/^not ready: /, '')
  switch (reason) {
    case 'opening':
      return i18n('Opening store')
    case 'starting':
      return i18n('Starting')
    case 'catch-up':
    case 'initial block download':
      return i18n('Syncing')
    case 'indexing':
      return i18n('Indexing')
    case 'stopping':
      return i18n('Stopping')
    case 'busy':
      return i18n('Busy')
  }
  if (/^tip stale \(last block [0-9]+s ago\)$/.test(reason))
    return i18n('Tip is stale')
  const behind = /^tip ([0-9]+) blocks behind headers$/.exec(reason)
  if (behind)
    return i18n('${blocks} blocks behind', { blocks: Number(behind[1]) })
  const index = /^scripthash index ([0-9]+) blocks behind tip$/.exec(reason)
  if (index)
    return i18n('Address index is ${blocks} blocks behind', {
      blocks: Number(index[1]),
    })
  return i18n('Not ready')
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'opening':
      return i18n('Opening store')
    case 'starting':
      return i18n('Starting')
    case 'catch-up':
      return i18n('Syncing')
    case 'indexing':
      return i18n('Indexing')
    case 'following':
      return i18n('Following chain')
    case 'stopping':
      return i18n('Stopping')
    default:
      return i18n('Unknown')
  }
}

export function stageLabel(stage: string | null): string | null {
  switch (stage) {
    case 'scripthash keys collect':
    case 'scripthash keys merge':
    case 'scripthash postings collect':
    case 'scripthash pack':
      return i18n('Building address index')
    case 'blockfilter build':
      return i18n('Building block filters')
    case 'sp_tweaks build':
      return i18n('Building Silent Payment index')
    case 'input backfill':
      return i18n('Updating input records')
    case 'tx.head backfill':
    case 'tx.head rebuild':
      return i18n('Rebuilding transaction index')
    default:
      return null
  }
}
