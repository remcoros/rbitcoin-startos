import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('startos')
    .addSync({
      dataPath: '/media/startos/volumes/main/',
      backupPath: '/media/startos/backup/main/',
    })
    .addSync({
      dataPath: '/media/startos/volumes/cold/',
      backupPath: '/media/startos/backup/cold/',
    }),
)
