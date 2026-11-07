import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value } = sdk
export const apis = sdk.Action.withInput(
  'apis',
  {
    name: i18n('Client APIs'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: 'enabled',
  },
  InputSpec.of({
    rpc_listen: Value.toggle({
      name: i18n('JSON-RPC'),
      default: false,
    }),
    electrum_listen: Value.toggle({
      name: i18n('Electrum server'),
      default: false,
    }),
    esplora_listen: Value.toggle({
      name: i18n('Esplora REST API'),
      default: false,
    }),
    rest: Value.toggle({
      name: i18n('Core REST (no authentication)'),
      default: false,
    }),
    metrics: Value.toggle({
      name: i18n('Prometheus metrics'),
      default: false,
    }),
    rpc_work_queue: Value.number({
      name: i18n('Concurrent RPC requests (0: default)'),
      required: true,
      default: 16,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
    electrum_max_subs: Value.number({
      name: i18n('Electrum subscriptions per connection'),
      required: true,
      default: 10000,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    esplora_max_inflight: Value.number({
      name: i18n('Concurrent Esplora requests'),
      required: true,
      default: 256,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    max_sh_creates: Value.number({
      name: i18n('Unpaged address history limit (outputs; 0: unlimited)'),
      required: true,
      default: 10000,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
    heavy_sh_creates: Value.number({
      name: i18n('Queue address-history queries above (outputs; 0: off)'),
      required: true,
      default: 10000,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
    store_read_budget: Value.number({
      name: i18n('Concurrent API disk reads (0: automatic)'),
      required: true,
      default: 0,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      rpc_listen: value.rpc_listen !== null,
      electrum_listen: value.electrum_listen !== null,
      esplora_listen: value.esplora_listen !== null,
      rest: value.rest,
      metrics: value.metrics,
      rpc_work_queue: value.rpc_work_queue,
      electrum_max_subs: value.electrum_max_subs,
      esplora_max_inflight: value.esplora_max_inflight,
      max_sh_creates: value.max_sh_creates,
      heavy_sh_creates: value.heavy_sh_creates,
      store_read_budget: value.store_read_budget,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        rpc_listen: input.rpc_listen ? '0.0.0.0:8332' : null,
        electrum_listen: input.electrum_listen ? '0.0.0.0:50001' : null,
        esplora_listen: input.esplora_listen ? '0.0.0.0:3000' : null,
        rest: input.rest,
        metrics: input.metrics,
        rpc_work_queue: input.rpc_work_queue,
        electrum_max_subs: input.electrum_max_subs,
        esplora_max_inflight: input.esplora_max_inflight,
        max_sh_creates: input.max_sh_creates,
        heavy_sh_creates: input.heavy_sh_creates,
        store_read_budget: input.store_read_budget,
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
