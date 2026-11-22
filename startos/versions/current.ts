import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.99:3',
  releaseNotes: {
    en_US:
      'Manage P2P onion addresses in the Tor section of the P2P interface. When you publish an onion, rbitcoin advertises its public IP addresses only if you opt in under Peer Settings.',
    es_ES:
      'Gestiona las direcciones onion en la sección Tor de la interfaz P2P. Si publicas una dirección onion, rbitcoin solo anuncia sus direcciones IP públicas si activas la opción en Ajustes de pares.',
    de_DE:
      'Verwalte P2P-Onion-Adressen im Tor-Bereich der P2P-Schnittstelle. Wenn du eine Onion-Adresse veröffentlichst, kündigt rbitcoin seine öffentlichen IP-Adressen nur an, wenn du dies in den Peer-Einstellungen aktivierst.',
    pl_PL:
      'Zarządzaj adresami onion w sekcji Tor interfejsu P2P. Gdy udostępniasz adres onion, rbitcoin ogłasza publiczne adresy IP tylko po włączeniu tej opcji w ustawieniach węzłów.',
    fr_FR:
      'Gérez les adresses onion dans la section Tor de l’interface P2P. Si vous publiez une adresse onion, rbitcoin annonce ses adresses IP publiques uniquement si vous activez cette option dans les paramètres des pairs.',
  },
  migrations: { up: async () => {}, down: IMPOSSIBLE },
})
