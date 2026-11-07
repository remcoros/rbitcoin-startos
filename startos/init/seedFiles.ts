import * as fs from 'node:fs/promises'
import { sdk } from '../sdk'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { storeJson } from '../fileModels/store.json'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await fs.mkdir(sdk.volumes.startos.path, { recursive: true, mode: 0o700 })
  await fs.chmod(sdk.volumes.startos.path, 0o700)
  if (!kind) return
  await storeJson.merge(effects, {})
  await nodeConfig.merge(effects, {})
})
