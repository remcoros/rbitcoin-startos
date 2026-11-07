import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, List } = sdk
export const peers = sdk.Action.withInput(
  'peers',
  {
    name: i18n('Peers'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Peers and privacy'),
    visibility: 'enabled',
  },
  InputSpec.of({
    listen: Value.toggle({
      name: i18n('Accept incoming P2P connections'),
      default: true,
    }),
    max_outbound: Value.number({
      name: i18n('Maximum outbound peers'),
      required: true,
      default: 16,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    max_inbound: Value.number({
      name: i18n('Maximum inbound peers (0: none)'),
      required: true,
      default: 200,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
    connect: Value.list(
      List.text(
        { name: i18n('Connect only to these peers (host:port)'), default: [] },
        { minLength: 1 },
      ),
    ),
    seed_node: Value.list(
      List.text(
        { name: i18n('Additional seed nodes'), default: [] },
        { minLength: 1 },
      ),
    ),
    no_seeds: Value.toggle({
      name: i18n('Disable DNS and fixed seeds'),
      default: false,
    }),
    no_discover: Value.toggle({
      name: i18n('Disable local address discovery and announcement'),
      default: false,
    }),
    external_ip: Value.list(
      List.text(
        { name: i18n('Advertised IP or onion addresses'), default: [] },
        { minLength: 1 },
      ),
    ),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      listen: value.listen !== '0',
      max_outbound: value.max_outbound,
      max_inbound: value.max_inbound,
      connect: value.connect,
      seed_node: value.seed_node,
      no_seeds: value.no_seeds,
      no_discover: value.no_discover,
      external_ip: value.external_ip,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        listen: input.listen ? '0.0.0.0:8333' : '0',
        max_outbound: input.max_outbound,
        max_inbound: input.max_inbound,
        connect: input.connect,
        seed_node: input.seed_node,
        no_seeds: input.no_seeds,
        no_discover: input.no_discover,
        external_ip: input.external_ip,
      }
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
