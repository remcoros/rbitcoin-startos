import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value } = sdk
export const mempool = sdk.Action.withInput(
  'mempool',
  {
    name: i18n('Mempool'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Policy and performance'),
    visibility: 'enabled',
  },
  InputSpec.of({
    mempool_size_mb: Value.number({
      name: i18n('Mempool budget (millions of weight units)'),
      required: true,
      default: 300,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    mempool_expiry: Value.number({
      name: i18n('Mempool expiry (hours)'),
      required: true,
      default: 336,
      min: 1,
      max: 4294967295,
      integer: true,
    }),
    persist_mempool: Value.toggle({
      name: i18n('Keep mempool across restarts'),
      default: true,
    }),
    blocks_only: Value.toggle({ name: i18n('Blocks only'), default: false }),
    min_relay_tx_fee: Value.text({
      name: i18n('Minimum relay fee (BTC per kvB)'),
      required: true,
      default: '0.00000100',
      masked: false,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      mempool_size_mb: value.mempool_size_mb,
      mempool_expiry: value.mempool_expiry,
      persist_mempool: value.persist_mempool,
      blocks_only: value.blocks_only,
      min_relay_tx_fee: value.min_relay_tx_fee,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        mempool_size_mb: input.mempool_size_mb,
        mempool_expiry: input.mempool_expiry,
        persist_mempool: input.persist_mempool,
        blocks_only: input.blocks_only,
        min_relay_tx_fee: input.min_relay_tx_fee.trim(),
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
