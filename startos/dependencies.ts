import { sdk } from './sdk'
import { i18n } from './i18n'
import { nodeConfig } from './fileModels/rbitcoin.conf'
import { storeJson } from './fileModels/store.json'
import { peerPublication } from './networking'

const tor = sdk.Dependency.optional('tor', {
  description: i18n(
    'Needed for Tor peer connections and published onion addresses.',
  ),
  metadata: {
    title: 'Tor',
    icon: 'https://raw.githubusercontent.com/Start9Labs/tor-startos/5ed4b1773efc3410e7089b48db7185230ccae5c1/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.4.9.15:1',
  healthChecks: [],
  enabled: async ({ effects }) => {
    const prefs = await storeJson
      .read((s) => ({
        routing: s.outgoingRouting,
        incoming: s.acceptIncomingPeers,
      }))
      .const(effects)
    const selected = await nodeConfig
      .read(
        (c) =>
          c.only_net.includes('onion') ||
          c.connect.some((p) => p.toLowerCase().includes('.onion:')),
      )
      .const(effects)
    const slots = await nodeConfig.read((c) => c.max_inbound).const(effects)
    const publication = await peerPublication(effects).const()
    return (
      prefs?.routing === 'tor' ||
      !!selected ||
      (!!prefs?.incoming && !!slots && publication.onion)
    )
  },
})

const i2pd = sdk.Dependency.optional('i2pd', {
  description: i18n('Needed for outgoing I2P peer connections.'),
  metadata: {
    title: 'I2P',
    icon: 'https://raw.githubusercontent.com/Start9Labs/i2pd-startos/9bf4569008e317030ed9efe840837a1d643ce89a/icon.svg',
  },
  kind: 'running',
  versionRange: '>=3.0.0:1',
  healthChecks: ['i2pd'],
  enabled: async ({ effects }) =>
    !!(await storeJson
      .read((s) => s.i2pEnabled && s.outgoingRouting === 'standard')
      .const(effects)),
})

export const dependencies = sdk.Dependencies.of()
  .addDependency(tor)
  .addDependency(i2pd)
