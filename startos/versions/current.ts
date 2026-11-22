import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.99:4',
  releaseNotes: {
    en_US:
      'rbitcoin can advertise its public addresses to direct peers and its onion address to Tor peers at the same time. Manage onion addresses in the Tor section of the P2P interface.',
    es_ES:
      'rbitcoin puede anunciar sus direcciones públicas a los pares directos y su dirección onion a los pares de Tor al mismo tiempo. Gestiona las direcciones onion en la sección Tor de la interfaz P2P.',
    de_DE:
      'rbitcoin kann seine öffentlichen Adressen bei direkt verbundenen Peers und seine Onion-Adresse bei Tor-Peers gleichzeitig ankündigen. Verwalte Onion-Adressen im Tor-Bereich der P2P-Schnittstelle.',
    pl_PL:
      'rbitcoin może jednocześnie ogłaszać adresy publiczne węzłom połączonym bezpośrednio i adres onion węzłom Tor. Zarządzaj adresami onion w sekcji Tor interfejsu P2P.',
    fr_FR:
      'rbitcoin peut annoncer simultanément ses adresses publiques aux pairs connectés directement et son adresse onion aux pairs Tor. Gérez les adresses onion dans la section Tor de l’interface P2P.',
  },
  migrations: { up: async () => {}, down: IMPOSSIBLE },
})
