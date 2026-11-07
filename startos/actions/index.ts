import { sdk } from '../sdk'
import { indexes } from './indexes'
import { storage } from './storage'
import { peers } from './peers'
import { privacy } from './privacy'
import { mempool } from './mempool'
import { permissions } from './permissions'
import { apis } from './apis'
import { mining } from './mining'
import { performance } from './performance'
import { logging } from './logging'
import { setRpcCredentials } from './setRpcCredentials'

export const actions = sdk.Actions.of()
  .addAction(indexes)
  .addAction(storage)
  .addAction(peers)
  .addAction(privacy)
  .addAction(permissions)
  .addAction(apis)
  .addAction(setRpcCredentials)
  .addAction(mining)
  .addAction(mempool)
  .addAction(performance)
  .addAction(logging)
