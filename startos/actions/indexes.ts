import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const indexes = sdk.Action.withInput(
  'indexes',
  {
    name: i18n('Indexes'),
    description: i18n('Choose which indexes to build.'),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Chain and storage'),
    visibility: 'enabled',
  },
  async () => {
    return InputSpec.of({
      sh_index: Value.toggle({
        name: i18n('Address history index'),
        description: i18n('For Electrum and Esplora wallet history.'),
        default: false,
      }),
      block_filter_index: Value.toggle({
        name: i18n('Compact block filters (BIP158)'),
        default: false,
      }),
      silentPayments: Value.dynamicUnion(() => ({
        name: i18n('Silent Payment index'),
        default: 'disabled',
        disabled: false,
        description: i18n(
          'With pruning, enable this before syncing or ensure the index covers all pruned blocks. If it cannot be enabled, check the logs. Disabling it while pruning may prevent re-enabling it later.',
        ),
        variants: Variants.of({
          disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
          enabled: {
            name: i18n('Enabled'),
            spec: InputSpec.of({
              cutoff: Value.number({
                name: i18n('Output cutoff'),
                units: 'sats',
                description: i18n('0 includes all outputs.'),
                required: true,
                default: 1000,
                min: 0,
                max: 4294967295,
                integer: true,
              }),
            }),
          },
        }),
      })),
    })
  },
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      sh_index: value.sh_index,
      block_filter_index: value.block_filter_index,
      silentPayments: value.sp_tweaks
        ? {
            selection: 'enabled' as const,
            value: { cutoff: value.sp_tweaks_dust },
          }
        : { selection: 'disabled' as const, value: {} },
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        sh_index: input.sh_index,
        block_filter_index: input.block_filter_index,
        sp_tweaks: input.silentPayments.selection === 'enabled',
        sp_tweaks_dust:
          input.silentPayments.selection === 'enabled'
            ? input.silentPayments.value.cutoff
            : current.sp_tweaks_dust,
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
