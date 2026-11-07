import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const apiLimits = sdk.Action.withInput(
  'apis-limits',
  async ({ effects }) => ({
    name: i18n('API limits'),
    description: i18n('Adjust client request and history limits.'),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: (await nodeConfig
      .read((c) => !!(c?.rpc_listen || c?.electrum_listen || c?.esplora_listen))
      .const(effects))
      ? 'enabled'
      : { disabled: i18n('Enable a client API first.') },
  }),
  async () => {
    const config = await nodeConfig.read().once()
    const history = !!(config?.electrum_listen || config?.esplora_listen)
    return InputSpec.of({
      rpc_work_queue: Value.number({
        name: i18n('Concurrent RPC requests'),
        required: true,
        default: 16,
        min: 1,
        max: 4294967295,
        integer: true,
      }),
      electrum_max_subs: Value.number({
        name: i18n('Electrum subscriptions'),
        description: i18n('Maximum subscriptions per connection.'),
        required: true,
        default: 10000,
        min: 1,
        max: 4294967295,
        integer: true,
      }),
      esplora_max_inflight: Value.number({
        name: i18n('Esplora requests'),
        description: i18n('Maximum concurrent requests.'),
        required: true,
        default: 256,
        min: 1,
        max: 4294967295,
        integer: true,
      }),
      max_sh_creates: Value.number({
        name: i18n('Unpaged history limit'),
        description: i18n('0 removes the limit for unpaged queries.'),
        units: i18n('outputs'),
        required: true,
        default: 10000,
        min: 0,
        max: 4294967295,
        integer: true,
      }),
      heavy_sh_creates: Value.number({
        name: i18n('Queue history queries above'),
        description: i18n('0 disables queueing.'),
        units: i18n('outputs'),
        required: true,
        default: 10000,
        min: 0,
        max: 4294967295,
        integer: true,
      }),
      store_read_budget: Value.union({
        name: i18n('API disk reads'),
        default: 'automatic',
        variants: Variants.of({
          automatic: { name: i18n('Automatic'), spec: InputSpec.of({}) },
          custom: {
            name: i18n('Custom'),
            spec: InputSpec.of({
              limit: Value.number({
                name: i18n('Concurrent reads'),
                required: true,
                default: null,
                min: 1,
                max: 4294967295,
                integer: true,
              }),
            }),
          },
        }),
      }),
    }).filter({
      rpc_work_queue: !!config?.rpc_listen,
      electrum_max_subs: !!config?.electrum_listen,
      esplora_max_inflight: !!config?.esplora_listen,
      max_sh_creates: history,
      heavy_sh_creates: history,
      store_read_budget: !!(config?.rpc_listen || history),
    })
  },
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      rpc_work_queue: value.rpc_work_queue || 16,
      electrum_max_subs: value.electrum_max_subs,
      esplora_max_inflight: value.esplora_max_inflight,
      max_sh_creates: value.max_sh_creates,
      heavy_sh_creates: value.heavy_sh_creates,
      store_read_budget:
        value.store_read_budget > 0
          ? {
              selection: 'custom' as const,
              value: { limit: value.store_read_budget },
            }
          : { selection: 'automatic' as const, value: {} },
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next = {
        ...current,
        rpc_work_queue:
          input.rpc_work_queue === 0
            ? 16
            : (input.rpc_work_queue ?? current.rpc_work_queue),
        electrum_max_subs: input.electrum_max_subs ?? current.electrum_max_subs,
        esplora_max_inflight:
          input.esplora_max_inflight ?? current.esplora_max_inflight,
        max_sh_creates: input.max_sh_creates ?? current.max_sh_creates,
        heavy_sh_creates: input.heavy_sh_creates ?? current.heavy_sh_creates,
        store_read_budget: input.store_read_budget
          ? input.store_read_budget.selection === 'automatic'
            ? 0
            : input.store_read_budget.value.limit
          : current.store_read_budget,
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
