import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.1:0',
  releaseNotes: {
    en_US: `- Update to rbitcoin 0.9.1. Opening an existing data directory upgrades it to schema 27; rbitcoin 0.9.0 cannot open it afterward. Keep a backup if you need to return to 0.9.0.
- Pruning removes script and witness history older than 288 blocks. Silent Payment tweaks can stay enabled when their index covers the blocks being pruned.
- Simplified Peer Settings provide Standard or Through Tor connections and optional I2P. Advanced Peer Settings retain manual peers, including local nodes for initial sync, network selection, and connection limits. P2P publication is managed through StartOS interfaces.
- Sync progress, API waiting states, and recovery logs are clearer. Peers stays visible and reports outgoing connections during initial sync. Storage and pruning now includes the disk I/O backend and help for pruning and witness cache.
- Recovery actions can rebuild local indexes or sync from scratch while preserving settings and RPC credentials.

[Upstream release notes](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.1)`,
    es_ES: `- Actualización a rbitcoin 0.9.1. Al abrir un directorio de datos existente, se actualiza al esquema 27; rbitcoin 0.9.0 ya no podrá abrirlo. Guarda una copia de seguridad si necesitas volver a 0.9.0.
- La poda elimina los datos de scripts y testigos de hace más de 288 bloques. El índice Silent Payment puede permanecer activado si cubre los bloques que se van a podar.
- Los ajustes de pares simplificados ofrecen conexiones Estándar o A través de Tor e I2P opcional. Los ajustes avanzados conservan pares manuales, incluidos nodos locales para la sincronización inicial, selección de redes y límites de conexión. Las direcciones P2P se publican mediante las interfaces de StartOS.
- Se aclaran el progreso de sincronización, la espera de las API y los registros de recuperación. Pares permanece visible e informa de las conexiones salientes durante la sincronización inicial. Almacenamiento y poda incluye el modo de E/S de disco y ayuda sobre la poda y la caché de testigos.
- Las acciones de recuperación permiten reconstruir índices locales o sincronizar desde cero conservando los ajustes y las credenciales RPC.

[Notas de la versión original](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.1)`,
    de_DE: `- Aktualisierung auf rbitcoin 0.9.1. Beim Öffnen eines vorhandenen Datenverzeichnisses wird es auf Schema 27 aktualisiert; rbitcoin 0.9.0 kann es danach nicht mehr öffnen. Bewahre eine Sicherung auf, falls du zu 0.9.0 zurückkehren möchtest.
- Pruning entfernt Skript- und Witness-Daten, die älter als 288 Blöcke sind. Der Silent-Payment-Index kann aktiviert bleiben, wenn er die zu löschenden Blöcke abdeckt.
- Vereinfachte Peer-Einstellungen bieten Standard-Verbindungen, Verbindungen über Tor und optional I2P. Erweiterte Peer-Einstellungen behalten manuelle Peers einschließlich lokaler Knoten für die Erstsynchronisierung, Netzwerkauswahl und Verbindungslimits. P2P-Adressen werden über StartOS-Schnittstellen veröffentlicht.
- Synchronisierungsfortschritt, API-Wartezustände und Wiederherstellungsprotokolle sind verständlicher. Peers bleibt sichtbar und zeigt ausgehende Verbindungen während der Erstsynchronisierung. Speicher und Pruning enthält nun das Festplatten-I/O-Backend und Hilfe zu Pruning und Witness-Cache.
- Wiederherstellungsaktionen können lokale Indizes neu aufbauen oder von vorn synchronisieren; Einstellungen und RPC-Zugangsdaten bleiben erhalten.

[Upstream-Versionshinweise](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.1)`,
    pl_PL: `- Aktualizacja do rbitcoin 0.9.1. Otwarcie istniejącego katalogu danych aktualizuje go do schematu 27; rbitcoin 0.9.0 nie będzie już mógł go otworzyć. Zachowaj kopię zapasową, jeśli chcesz wrócić do 0.9.0.
- Przycinanie usuwa dane skryptów i świadków starsze niż 288 bloków. Indeks Silent Payment może pozostać włączony, jeśli obejmuje bloki przeznaczone do przycięcia.
- Uproszczone ustawienia węzłów oferują połączenia standardowe, przez Tor oraz opcjonalnie I2P. Ustawienia zaawansowane zachowują ręczne węzły, w tym lokalne do synchronizacji początkowej, wybór sieci i limity połączeń. Adresy P2P publikuje się przez interfejsy StartOS.
- Czytelniejsze są postęp synchronizacji, oczekiwanie interfejsów API i logi odzyskiwania. Węzły pozostają widoczne i pokazują połączenia wychodzące podczas synchronizacji początkowej. Pamięć i przycinanie zawiera teraz mechanizm dyskowego I/O oraz pomoc dotyczącą przycinania i pamięci podręcznej świadków.
- Działania odzyskiwania pozwalają odbudować lokalne indeksy lub synchronizować od początku, zachowując ustawienia i dane logowania RPC.

[Informacje o wydaniu projektu](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.1)`,
    fr_FR: `- Mise à jour vers rbitcoin 0.9.1. L’ouverture d’un répertoire de données existant le fait passer au schéma 27 ; rbitcoin 0.9.0 ne pourra plus l’ouvrir ensuite. Conservez une sauvegarde si vous devez revenir à 0.9.0.
- L’élagage supprime les données de script et de témoin de plus de 288 blocs. L’index Silent Payment peut rester activé s’il couvre les blocs à élaguer.
- Les réglages simplifiés des pairs proposent les connexions Standard ou via Tor et I2P en option. Les réglages avancés conservent les pairs manuels, dont les nœuds locaux pour la synchronisation initiale, le choix des réseaux et les limites de connexion. Les adresses P2P sont publiées via les interfaces StartOS.
- La progression de synchronisation, l’attente des API et les journaux de récupération sont plus clairs. Pairs reste visible et indique les connexions sortantes pendant la synchronisation initiale. Stockage et élagage inclut désormais le moteur d’E/S disque et une aide sur l’élagage et le cache de témoins.
- Les actions de récupération permettent de reconstruire les index locaux ou de synchroniser depuis zéro en conservant les réglages et les identifiants RPC.

[Notes de version du projet](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.1)`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
