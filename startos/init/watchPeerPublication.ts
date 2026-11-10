import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { peerPublication } from '../networking'
import { storeJson } from '../fileModels/store.json'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { peers } from '../actions/peers'

export const watchPeerPublication = sdk.setupOnInit(async (effects) => {
  const incoming = await storeJson
    .read((s) => s.acceptIncomingPeers)
    .const(effects)
  const slots = await nodeConfig.read((c) => c.max_inbound).const(effects)
  const publication = await peerPublication(effects).const()
  if (incoming && slots && publication.incompatiblePort)
    await sdk.action.createOwnTask(effects, peers, 'important', {
      reason: i18n(
        'A published P2P address cannot be announced because its external port is not 8333 or it uses TLS. Review the P2P interface addresses in StartOS.',
      ),
    })
  else await sdk.action.clearTask(effects, `${sdk.manifest.id}:${peers.id}`)
})
