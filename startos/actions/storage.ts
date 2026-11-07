import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value } = sdk
export const storage = sdk.Action.withInput(
  'storage',
  {
    name: i18n('Storage and pruning'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Chain and storage'),
    visibility: 'enabled',
  },
  InputSpec.of({
    prune_seqsigwit: Value.toggle({
      name: i18n('Prune script and witness data'),
      description: i18n(
        'Permanently deletes script and witness data older than 288 blocks. Cannot be turned off after pruning begins. Incompatible with Silent Payments.',
      ),
      default: false,
    }),
    prune_seqsigwit_ram_threshold_bytes: Value.number({
      name: i18n('Witness RAM cache (bytes; 0: off)'),
      required: true,
      default: 268435456,
      min: 0,
      max: 9007199254740991,
      integer: true,
    }),
    datadir_hdd: Value.toggle({
      name: i18n('Optimize the main data directory for HDD'),
      default: false,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      prune_seqsigwit: value.prune_seqsigwit,
      prune_seqsigwit_ram_threshold_bytes:
        value.prune_seqsigwit_ram_threshold_bytes,
      datadir_hdd: value.datadir_hdd,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        prune_seqsigwit: input.prune_seqsigwit,
        prune_seqsigwit_ram_threshold_bytes:
          input.prune_seqsigwit_ram_threshold_bytes,
        datadir_hdd: input.datadir_hdd,
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
