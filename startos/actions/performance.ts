import { Store } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { validatePerformance } from '../utils'

const { InputSpec, Value } = sdk
export const performance = sdk.Action.withInput(
  'performance',
  {
    name: i18n('Performance'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Policy and performance'),
    visibility: 'enabled',
  },
  InputSpec.of({
    splitCold: Value.toggle({
      name: i18n('Use a separate cold volume'),
      description: i18n(
        'Cannot change once the data store exists. Does not select a disk.',
      ),
      default: false,
    }),
    ioBackend: Value.select({
      name: i18n('Disk I/O backend'),
      default: 'auto',
      values: {
        auto: i18n('Automatic'),
        pread: 'pread',
        uring: 'uring',
        pool: 'pool',
      },
    }),
  }),
  async () => {
    const value = await storeJson.read().once()
    if (!value) return {}
    return {
      splitCold: value.splitCold,
      ioBackend: value.ioBackend,
    }
  },
  async ({ effects, input }) => {
    await storeJson.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: Store = {
        ...current,
        splitCold: input.splitCold,
        ioBackend: input.ioBackend,
      }
      await validatePerformance(next, current)
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
