import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value } = sdk
export const logging = sdk.Action.withInput(
  'logging',
  {
    name: i18n('Logging'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Status and logs'),
    visibility: 'enabled',
  },
  InputSpec.of({
    log_level: Value.select({
      name: i18n('Log level'),
      default: 'info',
      values: {
        error: 'error',
        warn: 'warn',
        info: 'info',
        debug: 'debug',
        trace: 'trace',
        off: 'off',
      },
    }),
    api_log: Value.toggle({
      name: i18n('Log API calls'),
      description: i18n('Includes wallet requests. The log has no size limit.'),
      default: false,
    }),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      log_level: value.log_level,
      api_log: value.api_log !== null,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        log_level: input.log_level,
        api_log: input.api_log ? '/data/datadir/api.jsonl' : null,
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
