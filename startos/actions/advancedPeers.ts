import { NodeConfig, nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { validateConfig } from '../utils'
import { validateNetworkSettings } from '../networking'

const { InputSpec, Value, List } = sdk
export const advancedPeers = sdk.Action.withInput(
  'peers-advanced',
  {
    name: i18n('Advanced Peer Settings'),
    description: i18n(
      'Set automatic networks, manual peers, and connection limits.',
    ),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Peers and privacy'),
    visibility: 'enabled',
  },
  InputSpec.of({
    only_net: Value.multiselect({
      name: i18n('Automatic peer networks'),
      description: i18n(
        'Make automatic outgoing connections only to the selected networks. With none selected, use all available networks. Manual peers and incoming connections are controlled separately. IPv4 and IPv6 peers use Tor when Through Tor is selected.',
      ),
      default: [],
      values: { ipv4: 'IPv4', ipv6: 'IPv6', onion: 'Tor', i2p: 'I2P' },
    }),
    connect: Value.list(
      List.text(
        {
          name: i18n('Manual peers'),
          description: i18n(
            'Connect to these peers during sync and normal operation. A nearby node can improve initial sync. Leave empty to discover peers automatically. Setting manual peers disables automatic discovery; previously known peers may still be used during initial sync. Include the port. Local nodes require Standard routing.',
          ),
          default: [],
        },
        { minLength: 1 },
      ),
    ),
    max_outbound: Value.number({
      name: i18n('Maximum outgoing peers'),
      required: true,
      default: 16,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    max_inbound: Value.number({
      name: i18n('Maximum incoming peers'),
      required: true,
      default: 200,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    return value
      ? {
          only_net: value.only_net,
          connect: value.connect,
          max_outbound: value.max_outbound,
          max_inbound: value.max_inbound,
        }
      : {}
  },
  async ({ effects, input }) => {
    const prefs = await storeJson.read().once()
    if (!prefs) throw new Error(i18n('Configuration is not initialized.'))
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        ...input,
        connect: input.connect.map((p) => p.trim().toLowerCase()),
      }
      await validateConfig(next)
      validateNetworkSettings(next, prefs)
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
