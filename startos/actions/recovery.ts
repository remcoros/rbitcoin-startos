import * as fs from 'node:fs/promises'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { recoveryRequest } from '../utils'

async function schedule(
  effects: Parameters<typeof sdk.restart>[0],
  kind: 'address' | 'transaction' | 'resync',
) {
  try {
    await fs.symlink(kind, recoveryRequest)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
      throw new Error(i18n('Another recovery is already pending.'))
    throw error
  }
  const status = await sdk.getStatus(effects).once()
  if (
    status?.desired.main === 'running' ||
    status?.desired.main === 'restarting'
  )
    await sdk.restart(effects)
  return {
    version: '1' as const,
    title: i18n('Recovery scheduled'),
    message: i18n('The index will rebuild when the node starts.'),
    result: null,
  }
}

export const rebuildAddress = sdk.Action.withoutInput(
  'rebuild-address-history',
  {
    name: i18n('Rebuild address history'),
    description: i18n(
      'Delete and rebuild the address history index from the local chain data.',
    ),
    warning: i18n(
      'The node will restart and address history will be unavailable while the index rebuilds. This can take hours and use extra disk space.',
    ),
    allowedStatuses: 'any',
    group: i18n('Recovery'),
    visibility: 'enabled',
  },
  async ({ effects }) => {
    const config = await nodeConfig.read().once()
    if (!config?.sh_index)
      throw new Error(
        i18n('Address history is disabled. Enable it before rebuilding.'),
      )
    return schedule(effects, 'address')
  },
)

export const rebuildTransaction = sdk.Action.withoutInput(
  'rebuild-transaction-lookup',
  {
    name: i18n('Rebuild transaction lookup'),
    description: i18n(
      'Delete and rebuild the transaction lookup index from the local chain data.',
    ),
    warning: i18n(
      'The node will restart and the transaction lookup index will be rebuilt. This can take hours and use extra disk space.',
    ),
    allowedStatuses: 'any',
    group: i18n('Recovery'),
    visibility: 'enabled',
  },
  async ({ effects }) => schedule(effects, 'transaction'),
)

export const resync = sdk.Action.withoutInput(
  'resync',
  {
    name: i18n('Resync from scratch'),
    description: i18n(
      'Delete chain data and sync again. Settings and credentials are kept.',
    ),
    warning: i18n(
      'The node will stop. Chain data, indexes, peers, and mempool will be deleted when the service next starts. Syncing again may take days.',
    ),
    allowedStatuses: 'any',
    group: i18n('Recovery'),
    visibility: 'enabled',
  },
  async ({ effects }) => {
    try {
      await fs.symlink('resync', recoveryRequest)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
        throw new Error(i18n('Another recovery is already pending.'))
      throw error
    }
    try {
      await sdk.shutdown(effects)
    } catch (error) {
      console.error(
        'Unable to confirm node stop after scheduling resync:',
        error,
      )
      throw new Error(
        i18n(
          'Resync was scheduled, but the node stop could not be confirmed. Chain data may be deleted on the next start. Check the service status and logs before starting.',
        ),
      )
    }
    return {
      version: '1',
      title: i18n('Recovery scheduled'),
      message: i18n(
        'Choose settings before starting. Chain data will be deleted when the service starts.',
      ),
      result: null,
    }
  },
)
