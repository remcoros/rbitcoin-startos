import * as fs from 'node:fs/promises'
import { constants } from 'node:fs'
import { sdk } from './sdk'
import { resolveNetworking } from './networking'
import { checkApi, checkPeers, observeInitialSyncPeers } from './health'
import { i18n } from './i18n'
import { nodeConfig } from './fileModels/rbitcoin.conf'
import { storeJson } from './fileModels/store.json'
import {
  recoveryRequest,
  pendingRecovery,
  nodeArguments,
  ports,
  processEnvironment,
  readinessResult,
  readinessMessage,
  syncProgressMessage,
  runtimeConfig,
  validateConfig,
  healthReportingEffects,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  // Process the request before starting the node. Keep it until deletion succeeds.
  const recovery = await pendingRecovery()
  if (recovery !== null) {
    if (
      recovery !== 'address' &&
      recovery !== 'transaction' &&
      recovery !== 'resync'
    )
      throw new Error('Invalid recovery request')
    const store = sdk.volumes.main.subpath('datadir/store')
    if (recovery === 'resync') {
      const datadir = sdk.volumes.main.subpath('datadir')
      await fs.mkdir(datadir, { recursive: true, mode: 0o700 })
      await fs.chown(datadir, 10001, 10001)
      const lock = await fs.open(
        `${datadir}/.lock`,
        constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
        0o600,
      )
      try {
        await lock.chown(10001, 10001)
      } finally {
        await lock.close()
      }
      const mounts = sdk.Mounts.of()
        .mountVolume({
          volumeId: 'main',
          subpath: null,
          mountpoint: '/data',
          readonly: false,
        })
        .mountVolume({
          volumeId: 'startos',
          subpath: null,
          mountpoint: '/startos',
          readonly: false,
        })
      console.info(
        i18n('Removing old chain data before syncing. This may take a while.'),
      )
      const cleanupLog = setInterval(() => {
        console.info(i18n('Still removing old chain data...'))
      }, 30_000)
      try {
        await sdk.SubContainer.withTemp(
          effects,
          { imageId: 'rbitcoin' },
          mounts,
          'resync',
          async (sub) => {
            await sub.execFail(
              [
                'flock',
                '-n',
                '/data/datadir/.lock',
                'sh',
                '-c',
                'find /data/datadir -mindepth 1 -maxdepth 1 ! -name .lock -exec rm -rf -- {} + && rm /startos/recovery.request',
              ],
              { user: 'root', timeout: null },
            )
          },
        )
        console.info(i18n('Old chain data removed. Starting rbitcoin...'))
      } finally {
        clearInterval(cleanupLog)
      }
    } else if (recovery === 'transaction')
      await fs.rm(`${store}/tx.head`, { recursive: true, force: true })
    else {
      let entries: string[] = []
      try {
        entries = await fs.readdir(store)
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          )
        )
          throw error
      }
      for (const entry of entries.filter((name) =>
        name.startsWith('scripthash'),
      ))
        await fs.rm(`${store}/${entry}`, { recursive: true, force: true })
    }
    if (recovery !== 'resync') await fs.rm(recoveryRequest, { force: true })
  }
  const config = await nodeConfig.read().const(effects)
  const store = await storeJson.read().const(effects)
  if (!config || !store) throw new Error(i18n('Configuration is missing.'))
  if (config.rpc_listen && (!store.rpcPassword || !store.rpcToken))
    throw new Error(i18n('Generate RPC credentials first.'))
  await validateConfig(config)
  const network = await resolveNetworking(effects, config, store)
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
  await sub.writeFile(
    '/etc/rbitcoin.conf',
    runtimeConfig(config, network.config),
    {
      mode: 0o600,
    },
  )
  await fs.chown(await sub.subpath('/etc/rbitcoin.conf'), 10001, 10001)

  let waitingSince: number | null = null
  let previousReason = ''
  const initialSyncPeers = observeInitialSyncPeers()
  const healthEffects = healthReportingEffects(effects)
  const apiHealthTrigger = sdk.trigger.statusTrigger(30_000, {
    success: 60_000,
  })
  return sdk.Daemons.of(healthEffects)
    .addHealthCheck('peer-routing', {
      ready: {
        display: null,
        fn: () =>
          network.blocked
            ? {
                result: 'failure',
                message: i18n(
                  'I2P is unavailable. Waiting for the I2P service; other networks are not permitted by these peer settings.',
                ),
              }
            : { result: 'success' },
      },
      requires: [],
    })
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
        fn: async () => {
          initialSyncPeers.reset()
          return {
            command: sdk.useEntrypoint(nodeArguments(config)),
            env: processEnvironment(store),
            sigtermTimeout: 300_000,
            onStderr: (chunk) => {
              initialSyncPeers.consume(chunk)
              process.stderr.write(chunk)
            },
          }
        },
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
      requires: ['nocow', 'peer-routing'],
    })
    .addHealthCheck('peers', {
      ready: {
        display: i18n('Peers'),
        gracePeriod: 300_000,
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 5_000,
          failure: 5_000,
        }),
        fn: async () => {
          const result: Awaited<ReturnType<typeof checkPeers>> = network.blocked
            ? {
                result: 'failure',
                message: i18n(
                  'I2P is unavailable. Waiting for the I2P service; other networks are not permitted by these peer settings.',
                ),
              }
            : await checkPeers(
                effects,
                sub,
                config,
                store,
                network.i2pAvailable,
                initialSyncPeers,
              )
          return result
        },
      },
      requires: [],
    })
    .addHealthCheck('rpc', () =>
      config.rpc_listen
        ? {
            ready: {
              display: i18n('JSON-RPC'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('rpc', store.rpcPassword),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('rest', () =>
      config.rest && config.rpc_listen
        ? {
            ready: {
              display: i18n('Core REST'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('rest', null),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('electrum', () =>
      config.electrum_listen
        ? {
            ready: {
              display: i18n('Electrum'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('electrum', null),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('esplora', () =>
      config.esplora_listen
        ? {
            ready: {
              display: i18n('Esplora'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('esplora', null),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('sv2', () =>
      config.sv2_tp_listen
        ? {
            ready: {
              display: i18n('Stratum v2'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('sv2', null),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('metrics', () =>
      config.metrics
        ? {
            ready: {
              display: i18n('Prometheus metrics'),
              trigger: apiHealthTrigger,
              fn: () => checkApi('metrics', null),
            },
            requires: ['node'],
          }
        : null,
    )
    .addHealthCheck('synchronization', {
      ready: {
        display: i18n('Readiness'),
        fn: async () => {
          try {
            const response = await fetch(
              `http://127.0.0.1:${ports.health}/readyz`,
              { signal: AbortSignal.timeout(5000) },
            )
            if (response.ok) {
              waitingSince = null
              return { result: 'success' }
            }
            if (response.status === 503) {
              const body = await response.text()
              const reason = readinessMessage(body)
              try {
                const progress = await fetch(
                  `http://127.0.0.1:${ports.health}/progress`,
                  { signal: AbortSignal.timeout(5000) },
                )
                const state = (await progress.json()) as {
                  stage?: unknown
                  percent?: unknown
                }
                if (
                  typeof state.stage === 'string' &&
                  /^(tx\.head rebuild|scripthash (keys collect|keys merge|postings collect|pack))$/.test(
                    state.stage,
                  )
                ) {
                  return {
                    result: 'loading',
                    message:
                      typeof state.percent === 'number' &&
                      Number.isFinite(state.percent)
                        ? i18n('Rebuilding ${stage}: ${percent}%', {
                            stage: state.stage,
                            percent: state.percent,
                          })
                        : i18n('Rebuilding ${stage}', { stage: state.stage }),
                  }
                }
              } catch {
                /* fall back to readiness reason */
              }
              if (
                /^(?:not ready: )?(catch-up|initial block download)$/.test(
                  body.trim(),
                )
              ) {
                try {
                  const { stdout } = await sub.execFail(
                    [
                      'rbitcoin-cli',
                      '--rpc-socket',
                      '/data/datadir/rpc.sock',
                      'getblockchaininfo',
                    ],
                    { timeout: 5000 },
                  )
                  const message = syncProgressMessage(
                    JSON.parse(stdout.toString()),
                  )
                  if (message) return { result: 'loading', message }
                } catch {
                  /* Local RPC may not be available during early startup. */
                }
              }
              if (reason !== previousReason) waitingSince = null
              previousReason = reason
              waitingSince ??= Date.now()
              return readinessResult(body, Date.now() - waitingSince)
            }
            waitingSince = null
            return {
              result: 'failure',
              message: i18n('Readiness check failed. Check the logs.'),
            }
          } catch {
            waitingSince = null
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
