import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

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
      ioBackend: value.ioBackend,
    }
  },
  async ({ effects, input }) => {
    await storeJson.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      return {
        ...current,
        ioBackend: input.ioBackend,
      }
    })
    return {
      version: '1',
      title: i18n('Settings saved'),
      message: null,
      result: null,
    }
  },
)
