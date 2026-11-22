import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const v_0_9_99_2 = VersionInfo.of({
  version: '0.9.99:2',
  releaseNotes: {
    en_US:
      'Manage P2P onion addresses directly in the Tor section of the P2P interface.',
    es_ES:
      'Gestiona las direcciones onion directamente en la sección Tor de la interfaz P2P.',
    de_DE:
      'Onion-Adressen lassen sich direkt im Tor-Bereich der P2P-Schnittstelle verwalten.',
    pl_PL: 'Zarządzaj adresami onion bezpośrednio w sekcji Tor interfejsu P2P.',
    fr_FR:
      'Gérez les adresses onion directement dans la section Tor de l’interface P2P.',
  },
  migrations: {
    up: async ({ effects }) => {
      await effects.plugin.url.clearUrls({ except: [] })
      await sdk.MultiHost.of(effects, 'peer').retirePort(8334)
      await sdk.action.clearTask(effects, `${sdk.manifest.id}:peers`)
    },
    down: IMPOSSIBLE,
  },
})
