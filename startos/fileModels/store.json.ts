import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const storeShape = z.looseObject({
  outgoingRouting: z.enum(['standard', 'tor']).default('standard'),
  i2pEnabled: z.boolean().default(false),
  acceptIncomingPeers: z.boolean().default(true),
  rpcPassword: z.string().nullable().catch(null),
  rpcToken: z.string().nullable().catch(null),
  ioBackend: z.enum(['auto', 'pread', 'uring', 'pool']).catch('auto'),
})
export type Store = z.infer<typeof storeShape>
export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  storeShape,
)
