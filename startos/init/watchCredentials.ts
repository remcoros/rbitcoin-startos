import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'
import { setRpcCredentials } from '../actions/setRpcCredentials'

export const watchCredentials = sdk.setupOnInit(async (effects) => {
  const rpc = await nodeConfig.read((c) => c.rpc_listen).const(effects)
  const credentials = await storeJson
    .read((s) => !!s.rpcPassword && !!s.rpcToken)
    .const(effects)
  if (rpc && !credentials)
    await sdk.action.createOwnTask(effects, setRpcCredentials, 'critical', {
      reason: i18n('RPC needs credentials.'),
    })
  else
    await sdk.action.clearTask(
      effects,
      `${sdk.manifest.id}:${setRpcCredentials.id}`,
    )
})
