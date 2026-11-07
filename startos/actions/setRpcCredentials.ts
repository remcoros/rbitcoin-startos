import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { storeJson } from '../fileModels/store.json'

export const setRpcCredentials = sdk.Action.withoutInput(
  'set-rpc-credentials',
  async ({ effects }) => ({
    name: i18n('Generate RPC credentials'),
    description: i18n('Generate a password and Bearer token.'),
    warning: (await storeJson.read((s) => s.rpcPassword).const(effects))
      ? i18n(
          'Replaces both credentials and restarts a running node. Update every RPC client.',
        )
      : null,
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const rpcPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    const rpcToken = utils.getDefaultString({ charset: 'a-f,0-9', len: 64 })
    await storeJson.merge(effects, { rpcPassword, rpcToken })
    return {
      version: '1',
      title: i18n('RPC credentials'),
      message: i18n(
        'Use the password with HTTP Basic, or the token with Bearer authentication.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            value: 'rbitcoin',
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
            description: null,
          },
          {
            type: 'single',
            name: i18n('Password'),
            value: rpcPassword,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
            description: null,
          },
          {
            type: 'single',
            name: i18n('Bearer token'),
            value: rpcToken,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
            description: null,
          },
        ],
      },
    }
  },
)
