import { sdk } from './sdk'
import { i18n } from './i18n'
import { nodeConfig } from './fileModels/rbitcoin.conf'
import { storeJson } from './fileModels/store.json'
import { ports } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const config = await nodeConfig.read().const(effects)
  const incoming = await storeJson
    .read((s) => s.acceptIncomingPeers)
    .const(effects)
  if (!config) return []
  const receipts = []
  for (const item of [
    {
      id: 'peer',
      name: i18n('P2P'),
      description: i18n('Incoming Bitcoin peer connections.'),
      enabled: !!incoming && config.max_inbound > 0,
      port: ports.peer,
      external: ports.peer,
      kind: 'p2p',
      http: false,
      tls: false,
      path: '',
    },
    {
      id: 'rpc',
      name: i18n('JSON-RPC'),
      description: i18n(
        'Username: rbitcoin. Use RPC password or Bearer token.',
      ),
      enabled: !!config.rpc_listen,
      port: ports.rpc,
      external: ports.rpc,
      kind: 'api',
      http: true,
      tls: true,
      path: '',
    },
    {
      id: 'electrum',
      name: i18n('Electrum'),
      description: i18n('Wallet connections. No authentication.'),
      enabled: !!config.electrum_listen,
      port: ports.electrum,
      external: ports.electrum,
      kind: 'api',
      http: false,
      tls: true,
      path: '',
    },
    {
      id: 'esplora',
      name: i18n('Esplora'),
      description: i18n('REST API. No authentication.'),
      enabled: !!config.esplora_listen,
      port: ports.esplora,
      external: ports.esplora,
      kind: 'api',
      http: true,
      tls: true,
      path: '',
    },
    {
      id: 'health',
      name: i18n('Health'),
      description: i18n('Status and optional metrics. No authentication.'),
      enabled: true,
      port: ports.health,
      external: ports.health,
      kind: 'api',
      http: true,
      tls: true,
      path: '/progress',
    },
    {
      id: 'sv2',
      name: i18n('Stratum v2'),
      description: i18n('Mining templates over Noise.'),
      enabled: !!config.sv2_tp_listen,
      port: ports.sv2,
      external: ports.sv2,
      kind: 'api',
      http: false,
      tls: false,
      path: '',
    },
  ] satisfies {
    id: string
    name: string
    description: string
    enabled: boolean
    port: number
    external: number
    kind: 'api' | 'p2p'
    http: boolean
    tls: boolean
    path: string
  }[]) {
    if (!item.enabled) continue
    const origin = await sdk.MultiHost.of(effects, item.id).bindPort(
      item.port,
      item.http
        ? {
            protocol: 'http',
            preferredExternalPort: item.external,
            addSsl: { alpn: ['http/1.1'], preferredExternalPort: 443 },
            proxy: { addXForwardedHeaders: false },
          }
        : {
            protocol: null,
            preferredExternalPort: item.external,
            addSsl: item.tls
              ? { alpn: null, preferredExternalPort: 50002 }
              : null,
            secure: { ssl: false },
          },
    )
    receipts.push(
      await origin.export([
        sdk.createInterface(effects, {
          name: item.name,
          id: item.id,
          description: item.description,
          type: item.kind,
          masked: false,
          schemeOverride:
            item.id === 'electrum' ? { ssl: 'ssl', noSsl: 'tcp' } : null,
          username: null,
          path: item.path,
          query: {},
        }),
      ]),
    )
  }
  return receipts
})
