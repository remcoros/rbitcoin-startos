import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const apis = sdk.Action.withInput(
  'apis',
  {
    name: i18n('Client APIs'),
    description: i18n('Enable RPC, wallet APIs, and metrics.'),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: 'enabled',
  },
  InputSpec.of({
    rpc: Value.union({
      name: i18n('JSON-RPC'),
      default: 'disabled',
      variants: Variants.of({
        disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
        enabled: {
          name: i18n('Enabled'),
          spec: InputSpec.of({
            rest: Value.toggle({
              name: i18n('Core REST'),
              description: i18n('No authentication.'),
              default: false,
            }),
          }),
        },
      }),
    }),
    electrum_listen: Value.toggle({
      name: i18n('Electrum server'),
      default: false,
    }),
    esplora_listen: Value.toggle({
      name: i18n('Esplora REST API'),
      default: false,
    }),
    metrics: Value.toggle({ name: i18n('Prometheus metrics'), default: false }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      rpc: value.rpc_listen
        ? { selection: 'enabled' as const, value: { rest: value.rest } }
        : { selection: 'disabled' as const, value: {} },
      electrum_listen: value.electrum_listen !== null,
      esplora_listen: value.esplora_listen !== null,
      metrics: value.metrics,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        rpc_listen: input.rpc.selection === 'enabled' ? '0.0.0.0:8332' : null,
        electrum_listen: input.electrum_listen ? '0.0.0.0:50001' : null,
        esplora_listen: input.esplora_listen ? '0.0.0.0:3000' : null,
        rest: input.rpc.selection === 'enabled' && input.rpc.value.rest,
        metrics: input.metrics,
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
