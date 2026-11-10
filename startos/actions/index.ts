import { sdk } from '../sdk'
import { rebuildAddress, rebuildTransaction, resync } from './recovery'
import { indexes } from './indexes'
import { storage } from './storage'
import { peers } from './peers'
import { advancedPeers } from './advancedPeers'
import { mempool } from './mempool'
import { permissions } from './permissions'
import { apis } from './apis'
import { apiLimits } from './apiLimits'
import { mining } from './mining'
import { logging } from './logging'
import { setRpcCredentials, viewRpcCredentials } from './setRpcCredentials'

export const actions = sdk.Actions.of()
  .addAction(indexes)
  .addAction(storage)
  .addAction(peers)
  .addAction(advancedPeers)
  .addAction(permissions)
  .addAction(apis)
  .addAction(apiLimits)
  .addAction(setRpcCredentials)
  .addAction(viewRpcCredentials)
  .addAction(mining)
  .addAction(mempool)
  .addAction(logging)
  .addAction(rebuildAddress)
  .addAction(rebuildTransaction)
  .addAction(resync)
