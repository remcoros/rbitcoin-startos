import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.9.2:0',
  releaseNotes: {
    en_US: `- Update to rbitcoin 0.9.2, fixing block validation, pruned-node reorganizations, Silent Payment addresses, and peer reconnection.
- A data directory that already connected the invalid re-spend described in the upstream notes must be synced again; upgrading alone does not repair it. Existing 0.9.1 data otherwise opens in place. Use the recovery action to resync if affected.
- Peer health waits during initial sync and indexing. API checks run less often when healthy.

[Upstream release notes](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.2)`,
    es_ES: `- Actualización a rbitcoin 0.9.2, que corrige la validación de bloques, las reorganizaciones de nodos podados, las direcciones Silent Payment y la reconexión de pares.
- Un directorio de datos que ya haya conectado el doble gasto inválido descrito en las notas originales debe sincronizarse de nuevo; la actualización no lo repara. Los demás datos de 0.9.1 se abren sin cambios. Si está afectado, usa la acción de recuperación para volver a sincronizar.
- La comprobación de pares espera durante la sincronización inicial y la indexación. Las API se comprueban con menor frecuencia cuando funcionan correctamente.

[Notas de la versión original](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.2)`,
    de_DE: `- Aktualisierung auf rbitcoin 0.9.2 mit Korrekturen für Blockvalidierung, Reorganisationen beschnittener Knoten, Silent-Payment-Adressen und Peer-Neuverbindungen.
- Ein Datenverzeichnis, das den in den Upstream-Versionshinweisen beschriebenen ungültigen erneuten Spend bereits verbunden hat, muss neu synchronisiert werden; das Update repariert es nicht. Andere Daten von 0.9.1 werden unverändert geöffnet. Nutze bei Betroffenheit die Wiederherstellungsaktion zur Neusynchronisierung.
- Die Peer-Prüfung wartet während der Erstsynchronisierung und Indizierung. API-Prüfungen laufen seltener, wenn die APIs funktionieren.

[Upstream-Versionshinweise](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.2)`,
    pl_PL: `- Aktualizacja do rbitcoin 0.9.2 poprawia walidację bloków, reorganizacje przyciętych węzłów, adresy Silent Payment i ponowne łączenie z węzłami.
- Katalog danych, który już dołączył nieprawidłowe ponowne wydanie opisane w informacjach projektu, wymaga ponownej synchronizacji; sama aktualizacja go nie naprawia. Pozostałe dane 0.9.1 otwierają się bez zmian. W razie wystąpienia problemu użyj działania odzyskiwania, aby zsynchronizować dane ponownie.
- Kontrola węzłów oczekuje podczas początkowej synchronizacji i indeksowania. Działające API są sprawdzane rzadziej.

[Informacje o wydaniu projektu](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.2)`,
    fr_FR: `- Mise à jour vers rbitcoin 0.9.2 : corrections de la validation des blocs, des réorganisations des nœuds élagués, des adresses Silent Payment et de la reconnexion aux pairs.
- Un répertoire de données ayant déjà connecté la nouvelle dépense invalide décrite dans les notes du projet doit être synchronisé à nouveau ; la mise à jour ne le répare pas. Les autres données 0.9.1 s’ouvrent sans modification. Si vous êtes concerné, utilisez l’action de récupération pour resynchroniser.
- La vérification des pairs attend pendant la synchronisation initiale et l’indexation. Les API sont vérifiées moins souvent lorsqu’elles fonctionnent.

[Notes de version du projet](https://github.com/rbitcoin-org/rbitcoin/releases/tag/v0.9.2)`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
