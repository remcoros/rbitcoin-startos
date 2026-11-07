import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'
import { rpcCredentials } from '../utils'

export const setRpcCredentials = sdk.Action.withoutInput(
  'set-rpc-credentials',
  async ({ effects }) => {
    const hasCredentials = !!(await storeJson
      .read((s) => s.rpcPassword)
      .const(effects))
    return {
      name: hasCredentials
        ? i18n('Replace RPC credentials')
        : i18n('Generate RPC credentials'),
      description: hasCredentials
        ? i18n('Replace the password and Bearer token.')
        : i18n('Generate a password and Bearer token.'),
      warning: hasCredentials
        ? i18n(
            'Replaces both credentials and restarts a running node. Update every RPC client.',
          )
        : null,
      allowedStatuses: 'any',
      group: i18n('Clients and mining'),
      visibility: 'enabled',
    }
  },
  async ({ effects }) => {
    const rpcPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    const rpcToken = utils.getDefaultString({ charset: 'a-f,0-9', len: 64 })
    await storeJson.merge(effects, { rpcPassword, rpcToken })
    return rpcCredentials({ rpcPassword, rpcToken })
  },
)

export const viewRpcCredentials = sdk.Action.withoutInput(
  'view-rpc-credentials',
  async ({ effects }) => ({
    name: i18n('View RPC credentials'),
    description: i18n('Show the saved RPC password and token.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: (await storeJson
      .read((s) => !!(s.rpcPassword && s.rpcToken))
      .const(effects))
      ? 'enabled'
      : { disabled: i18n('Generate RPC credentials first.') },
  }),
  async () =>
    rpcCredentials(
      (await storeJson.read().once()) ?? { rpcPassword: null, rpcToken: null },
    ),
)
