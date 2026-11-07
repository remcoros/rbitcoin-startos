import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { endpointInput, endpointPrefill, validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const privacy = sdk.Action.withInput(
  'privacy',
  {
    name: i18n('Proxies and networks'),
    description: i18n('Choose peer networks and proxies.'),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Peers and privacy'),
    visibility: 'enabled',
  },
  InputSpec.of({
    proxy: endpointInput(i18n('P2P proxy')),
    onion: endpointInput(i18n('Onion proxy')),
    only_net: Value.union({
      name: i18n('Peer networks'),
      default: 'all',
      variants: Variants.of({
        all: { name: i18n('All available'), spec: InputSpec.of({}) },
        selected: {
          name: i18n('Selected networks'),
          spec: InputSpec.of({
            networks: Value.multiselect({
              name: i18n('Peer networks'),
              default: [],
              values: {
                ipv4: 'IPv4',
                ipv6: 'IPv6',
                onion: 'onion',
                i2p: 'I2P',
                cjdns: 'CJDNS',
              },
            }),
          }),
        },
      }),
    }),
    i2p_sam: endpointInput(i18n('I2P SAM endpoint')),
    cjdns_reachable: Value.toggle({
      name: i18n('CJDNS routing is available'),
      default: false,
    }),
  }).add(({ Value }) => ({
    proxy_randomize: Value.dynamicToggle(async ({ prefill }) => {
      const config = await nodeConfig.read().once()
      const proxy =
        prefill?.proxy?.selection ?? (config?.proxy ? 'enabled' : 'disabled')
      const onion =
        prefill?.onion?.selection ?? (config?.onion ? 'enabled' : 'disabled')
      return {
        name: i18n('Randomize SOCKS credentials'),
        default: true,
        disabled:
          proxy === 'enabled' || onion === 'enabled'
            ? false
            : i18n('Enable a SOCKS5 proxy first.'),
      }
    }),
  })),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      proxy: endpointPrefill(value.proxy),
      onion: endpointPrefill(value.onion),
      proxy_randomize: value.proxy_randomize,
      only_net: value.only_net.length
        ? {
            selection: 'selected' as const,
            value: { networks: value.only_net },
          }
        : { selection: 'all' as const, value: {} },
      i2p_sam: endpointPrefill(value.i2p_sam),
      cjdns_reachable: value.cjdns_reachable,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        proxy:
          input.proxy.selection === 'enabled'
            ? input.proxy.value.address.trim()
            : null,
        onion:
          input.onion.selection === 'enabled'
            ? input.onion.value.address.trim()
            : null,
        proxy_randomize: input.proxy_randomize,
        only_net:
          input.only_net.selection === 'selected'
            ? input.only_net.value.networks
            : [],
        i2p_sam:
          input.i2p_sam.selection === 'enabled'
            ? input.i2p_sam.value.address.trim()
            : null,
        cjdns_reachable: input.cjdns_reachable,
      }
      if (input.only_net.selection === 'selected' && !next.only_net.length)
        throw new Error(i18n('Choose at least one peer network.'))
      await validateConfig(next)
      return next
    })
    return {
      version: '1',
      title: i18n('Settings saved'),
      message: null,
      result: null,
    }
  },
)
