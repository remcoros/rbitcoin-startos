import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const storeShape = z.looseObject({
  rpcPassword: z.string().nullable().catch(null),
  rpcToken: z.string().nullable().catch(null),
  splitCold: z.boolean().catch(false),
  ioBackend: z.enum(['auto', 'pread', 'uring', 'pool']).catch('auto'),
})
export type Store = z.infer<typeof storeShape>
export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  storeShape,
)
