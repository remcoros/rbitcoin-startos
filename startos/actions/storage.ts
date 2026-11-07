import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { exists, mibToBytes, validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const storage = sdk.Action.withInput(
  'storage',
  {
    name: i18n('Storage and pruning'),
    description: i18n('Set pruning, cache size, and HDD options.'),
    warning: i18n('Pruning is permanent. Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Chain and storage'),
    visibility: 'enabled',
  },
  async () => {
    const pruned = await exists(
      sdk.volumes.main.subpath('datadir/store/seqsigwit.prune'),
    )
    return InputSpec.of({
      pruning: Value.dynamicUnion(() => ({
        name: i18n('Pruning'),
        default: 'disabled',
        warning: i18n(
          'Permanently deletes script and witness data older than 288 blocks. Cannot be turned off after pruning begins. Incompatible with Silent Payments.',
        ),
        disabled: pruned ? ['disabled'] : false,
        variants: Variants.of({
          disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
          enabled: {
            name: i18n('Enabled'),
            spec: InputSpec.of({
              cache: Value.number({
                name: i18n('Witness cache'),
                units: 'MiB',
                required: true,
                default: 256,
                min: 0,
                max: Number.MAX_SAFE_INTEGER / 1048576,
                step: 1,
                integer: false,
              }),
            }),
          },
        }),
      })),
      datadir_hdd: Value.toggle({
        name: i18n('Optimize for HDD'),
        default: false,
      }),
    })
  },
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      pruning: value.prune_seqsigwit
        ? {
            selection: 'enabled' as const,
            value: {
              cache: value.prune_seqsigwit_ram_threshold_bytes / 1048576,
            },
          }
        : { selection: 'disabled' as const, value: {} },
      datadir_hdd: value.datadir_hdd,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        prune_seqsigwit: input.pruning.selection === 'enabled',
        prune_seqsigwit_ram_threshold_bytes:
          input.pruning.selection === 'enabled'
            ? mibToBytes(input.pruning.value.cache)
            : current.prune_seqsigwit_ram_threshold_bytes,
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
