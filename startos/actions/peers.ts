import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'
import { validateNetworkSettings } from '../networking'

const { InputSpec, Value } = sdk
export const peers = sdk.Action.withInput(
  'peers',
  {
    name: i18n('Peer Settings'),
    description: i18n('Choose how rbitcoin connects to peers.'),
    warning: i18n('Saving restarts a running node.'),
    allowedStatuses: 'any',
    group: i18n('Peers and privacy'),
    visibility: 'enabled',
  },
  InputSpec.of({
    outgoingRouting: Value.select({
      name: i18n('Outgoing connections'),
      description: i18n(
        'Standard connects directly to IPv4 and IPv6 peers and uses Tor for onion peers. Through Tor routes IPv4, IPv6, and onion peer connections through Tor, with no direct fallback. Incoming access is configured separately.',
      ),
      default: 'standard',
      values: { standard: i18n('Standard'), tor: i18n('Through Tor') },
    }),
    acceptIncomingPeers: Value.toggle({
      name: i18n('Accept incoming peer connections'),
      description: i18n(
        'Let other Bitcoin peers connect to your node. Publish addresses using the P2P interface in StartOS.',
      ),
      default: true,
    }),
  }).add(({ Value }) => ({
    i2pEnabled: Value.dynamicToggle(async ({ prefill }) => ({
      name: i18n('I2P connections'),
      description: i18n(
        'Also connect to peers over I2P in Standard mode. Requires the I2P service. The preference is kept while using Through Tor. Enabling or restoring I2P may restart rbitcoin.',
      ),
      default: false,
      disabled:
        (prefill?.outgoingRouting ??
          (await storeJson.read().once())?.outgoingRouting ??
          'standard') === 'tor'
          ? i18n(
              'I2P is available with Standard routing. Your preference is kept.',
            )
          : false,
    })),
  })),
  async () => {
    const value = await storeJson.read().once()
    return value
      ? {
          outgoingRouting: value.outgoingRouting,
          i2pEnabled: value.i2pEnabled,
          acceptIncomingPeers: value.acceptIncomingPeers,
        }
      : {}
  },
  async ({ effects, input }) => {
    const config = await nodeConfig.read().once()
    if (!config) throw new Error(i18n('Configuration is not initialized.'))
    await storeJson.update(effects, (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next = {
        ...current,
        ...input,
        i2pEnabled:
          input.outgoingRouting === 'tor'
            ? current.i2pEnabled
            : input.i2pEnabled,
      }
      validateNetworkSettings(config, next)
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
