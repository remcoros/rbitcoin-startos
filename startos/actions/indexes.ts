import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value } = sdk
export const indexes = sdk.Action.withInput(
  'indexes',
  {
    name: i18n('Indexes'),
    description: i18n(
      'Indexes need extra disk space and time to build. Saving restarts a running node.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Chain and storage'),
    visibility: 'enabled',
  },
  InputSpec.of({
    sh_index: Value.toggle({
      name: i18n('Address history index'),
      description: i18n(
        'Wallet history in Electrum and Esplora needs this index.',
      ),
      default: false,
    }),
    block_filter_index: Value.toggle({
      name: i18n('Compact block filters (BIP158)'),
      default: false,
    }),
    sp_tweaks: Value.toggle({
      name: i18n('Silent Payment index'),
      description: i18n('Requires pruning off.'),
      default: false,
    }),
    sp_tweaks_dust: Value.number({
      name: i18n('Silent Payment output cutoff (satoshis; 0: all)'),
      required: true,
      default: 1000,
      min: 0,
      max: 4294967295,
      integer: true,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      sh_index: value.sh_index,
      block_filter_index: value.block_filter_index,
      sp_tweaks: value.sp_tweaks,
      sp_tweaks_dust: value.sp_tweaks_dust,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        sh_index: input.sh_index,
        block_filter_index: input.block_filter_index,
        sp_tweaks: input.sp_tweaks,
        sp_tweaks_dust: input.sp_tweaks_dust,
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
