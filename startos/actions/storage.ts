import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'
import { hasPrunedStore, mibToBytes, validateConfig } from '../utils'

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
    const pruned = await hasPrunedStore()
    return InputSpec.of({
      pruning: Value.dynamicUnion(() => ({
        name: i18n('Pruning'),
        description: i18n(
          'Save disk space by permanently deleting script and witness data older than 288 blocks. Other chain data is kept.',
        ),
        default: 'disabled',
        warning: i18n(
          'Permanently deletes script and witness data older than 288 blocks. Cannot be turned off after pruning begins. If the Silent Payment index is enabled, it must cover the blocks that will be pruned.',
        ),
        disabled: pruned ? ['disabled'] : false,
        variants: Variants.of({
          disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
          enabled: {
            name: i18n('Enabled'),
            spec: InputSpec.of({
              cache: Value.number({
                name: i18n('Witness cache'),
                description: i18n(
                  'Size threshold for recent script and witness data cached in RAM. Memory overhead is extra. Higher values can reduce disk reads. Set to 0 to disable the RAM cache; recent data stays on disk.',
                ),
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
      ioBackend: Value.select({
        name: i18n('Disk I/O backend'),
        description: i18n('Leave on Automatic unless troubleshooting.'),
        default: 'auto',
        values: {
          auto: i18n('Automatic'),
          pread: 'pread',
          uring: 'uring',
          pool: 'pool',
        },
      }),
    })
  },
  async () => {
    const [value, prefs] = await Promise.all([
      nodeConfig.read().once(),
      storeJson.read().once(),
    ])
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
      ioBackend: prefs?.ioBackend ?? 'auto',
    }
  },
  async ({ effects, input }) => {
    if (!(await storeJson.read().once())) {
      throw new Error(i18n('Configuration is not initialized.'))
    }
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
    await storeJson.update(effects, (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      return { ...current, ioBackend: input.ioBackend }
    })
    return {
      version: '1',
      title: i18n('Settings saved'),
      message: null,
      result: null,
    }
  },
)
