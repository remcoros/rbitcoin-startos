import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, List } = sdk
export const permissions = sdk.Action.withInput(
  'permissions',
  {
    name: i18n('Peer permissions'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Peers and privacy'),
    visibility: 'enabled',
  },
  InputSpec.of({
    net_permission: Value.list(
      List.text(
        {
          name: i18n('Permissions by IP range'),
          description: i18n('For example: noban@192.0.2.0/24.'),
          default: [],
        },
        { minLength: 1 },
      ),
    ),
  }),
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      net_permission: value.net_permission,
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        net_permission: input.net_permission,
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
