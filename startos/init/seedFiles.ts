import * as fs from 'node:fs/promises'
import { sdk } from '../sdk'
import { recoveryRequest, pendingRecovery, exists } from '../utils'
import { storage } from '../actions/storage'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await fs.mkdir(sdk.volumes.startos.path, { recursive: true, mode: 0o700 })
  await fs.chmod(sdk.volumes.startos.path, 0o700)
  if (kind === 'restore') {
    const pending = await pendingRecovery()
    const pruned = await exists(
      sdk.volumes.main.subpath('datadir/store/seqsigwit.prune'),
    )
    const config = await nodeConfig.read().once()
    if (
      pending === 'resync' &&
      pruned &&
      config &&
      (!config.prune_seqsigwit || config.sp_tweaks)
    ) {
      await nodeConfig.merge(effects, {
        prune_seqsigwit: true,
        sp_tweaks: false,
      })
      await sdk.action.createOwnTask(effects, storage, 'important', {
        reason: i18n(
          'The restored chain is pruned. Pruning was enabled and Silent Payments disabled to match it. Review storage settings.',
        ),
      })
    }
    await fs.rm(recoveryRequest, { force: true })
  }
  if (!kind) return
  await storeJson.merge(effects, {})
  await nodeConfig.merge(effects, {})
})
