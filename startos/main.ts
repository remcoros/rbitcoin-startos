import * as fs from 'node:fs/promises'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { nodeConfig } from './fileModels/rbitcoin.conf'
import { storeJson } from './fileModels/store.json'
import {
  nodeArguments,
  ports,
  processEnvironment,
  readinessMessage,
  runtimeConfig,
  validateConfig,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const config = await nodeConfig.read().const(effects)
  const store = await storeJson.read().const(effects)
  if (!config || !store) throw new Error(i18n('Configuration is missing.'))
  if (config.rpc_listen && (!store.rpcPassword || !store.rpcToken))
    throw new Error(i18n('Generate RPC credentials first.'))
  await validateConfig(config)
  await fs.mkdir(sdk.volumes.main.path, { recursive: true })
  await fs.chown(sdk.volumes.main.path, 10001, 10001)
  const datadir = sdk.volumes.main.subpath('datadir')
  await fs.mkdir(datadir, { recursive: true, mode: 0o700 })
  await fs.chown(datadir, 10001, 10001)
  if (config.rpc_listen && store.rpcPassword && store.rpcToken) {
    for (const [name, contents] of [
      ['rpc.cookie', `rbitcoin:${store.rpcPassword}`],
      ['rpc.token', store.rpcToken],
    ]) {
      const path = sdk.volumes.main.subpath(`datadir/${name}`)
      await fs.writeFile(path, contents, { mode: 0o600 })
      await fs.chmod(path, 0o600)
      await fs.chown(path, 10001, 10001)
    }
  }
  const mounts = sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: '/data',
    readonly: false,
  })
  const sub = sdk.SubContainer.of(
    effects,
    { imageId: 'rbitcoin' },
    mounts,
    'rbitcoin',
  )
  await sub.writeFile('/etc/rbitcoin.conf', runtimeConfig(config), {
    mode: 0o600,
  })
  await fs.chown(await sub.subpath('/etc/rbitcoin.conf'), 10001, 10001)

  return sdk.Daemons.of(effects)
    .addOneshot('nocow', {
      subcontainer: sub,
      exec: {
        command: [
          'find',
          '/data',
          '-type',
          'd',
          '-exec',
          'chattr',
          '+C',
          '{}',
          '+',
        ],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('node', {
      subcontainer: sub,
      exec: {
        command: sdk.useEntrypoint(nodeArguments(config)),
        env: processEnvironment(store),
        sigtermTimeout: 300_000,
      },
      ready: {
        display: i18n('Node'),
        fn: async () => {
          try {
            const response = await fetch(
              `http://127.0.0.1:${ports.health}/healthz`,
              { signal: AbortSignal.timeout(5000) },
            )
            return response.ok
              ? {
                  result: 'success',
                }
              : {
                  result: 'failure',
                  message: i18n('Health check failed. Check the logs.'),
                }
          } catch {
            return {
              result: 'failure',
              message: i18n('Not responding. Check the logs.'),
            }
          }
        },
      },
      requires: ['nocow'],
    })
    .addHealthCheck('synchronization', {
      ready: {
        display: i18n('Readiness'),
        fn: async () => {
          try {
            const response = await fetch(
              `http://127.0.0.1:${ports.health}/readyz`,
              { signal: AbortSignal.timeout(5000) },
            )
            if (response.ok)
              return {
                result: 'success',
              }
            if (response.status === 503)
              return {
                result: 'loading',
                message: readinessMessage(await response.text()),
              }
            return {
              result: 'failure',
              message: i18n('Readiness check failed. Check the logs.'),
            }
          } catch {
            return {
              result: 'failure',
              message: i18n('Not responding. Check the logs.'),
            }
          }
        },
      },
      requires: ['node'],
    })
})
