import { connect } from 'node:net'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { ports } from './utils'

const timeout = () => AbortSignal.timeout(5000)

async function http(path: string, port: number, init?: RequestInit) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...init,
    signal: timeout(),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response
}

async function electrum() {
  await new Promise<void>((resolve, reject) => {
    const socket = connect(ports.electrum, '127.0.0.1')
    let data = ''
    socket.setTimeout(5000)
    socket.on('connect', () =>
      socket.write(
        '{"id":1,"method":"server.version","params":["StartOS","1.4"]}\n',
      ),
    )
    socket.on('data', (chunk) => {
      data += chunk.toString()
      if (data.length > 16384) {
        socket.destroy()
        reject(new Error('oversized response'))
        return
      }
      const line = data.split('\n')[0]
      if (!data.includes('\n')) return
      try {
        const reply = JSON.parse(line)
        if (reply.id !== 1 || !Array.isArray(reply.result))
          throw new Error('invalid response')
        socket.destroy()
        resolve()
      } catch (error) {
        socket.destroy()
        reject(error)
      }
    })
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('timeout'))
    })
    socket.on('error', reject)
    socket.on('end', () => reject(new Error('closed')))
  })
}

async function listener(port: number) {
  await new Promise<void>((resolve, reject) => {
    const socket = connect(port, '127.0.0.1')
    socket.setTimeout(5000)
    socket.on('connect', () => {
      socket.destroy()
      resolve()
    })
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('timeout'))
    })
    socket.on('error', reject)
  })
}

export async function checkApi(
  kind: 'rpc' | 'rest' | 'electrum' | 'esplora' | 'sv2' | 'metrics',
  password: string | null,
) {
  try {
    if (kind === 'rpc') {
      const response = await http('/', ports.rpc, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${Buffer.from(`rbitcoin:${password}`).toString('base64')}`,
        },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 'startos',
          method: 'getblockchaininfo',
          params: [],
        }),
      })
      const body = (await response.json()) as {
        result?: unknown
        error?: unknown
      }
      if (!body.result || body.error) throw new Error('invalid RPC response')
    } else if (kind === 'rest') {
      await http('/rest/chaininfo.json', ports.rpc)
    } else if (kind === 'electrum') {
      await electrum()
    } else if (kind === 'esplora') {
      const response = await http('/blocks/tip/height', ports.esplora)
      if (!/^\d+$/.test((await response.text()).trim()))
        throw new Error('invalid height')
    } else if (kind === 'metrics') {
      await http('/metrics', ports.health)
    } else {
      await listener(ports.sv2)
      return { result: 'success' as const, message: i18n('Listening') }
    }
    return { result: 'success' as const }
  } catch {
    try {
      const ready = await fetch(`http://127.0.0.1:${ports.health}/readyz`, {
        signal: timeout(),
      })
      if (ready.ok)
        return {
          result: 'failure' as const,
          message: i18n('API unavailable. Check the logs.'),
        }
      if (ready.status === 503) {
        const reason = (await ready.text()).trim().replace(/^not ready: /, '')
        if (reason === 'catch-up' || reason === 'initial block download')
          return {
            result: 'loading' as const,
            waiting: true,
            message: i18n('API unavailable while syncing.'),
          }
      }
    } catch {
      /* node readiness is not available yet */
    }
    return {
      result: 'loading' as const,
      waiting: true,
      message: i18n('API unavailable while the node is not ready.'),
    }
  }
}

export function observeInitialSyncPeers(now = () => performance.now()) {
  let pending = ''
  let discard = false
  let sample: { count: number; at: number } | null = null
  return {
    reset() {
      pending = ''
      discard = false
      sample = null
    },
    consume(chunk: Buffer | string) {
      const lines = (pending + chunk.toString()).split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) {
        if (!discard && line.length <= 16384) {
          const clean = line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
          const match =
            /^\S+ INFO\s+ibd: progress\b.*?\bpeers=(\d+)(?=\s|$)/.exec(clean)
          if (match) {
            const count = Number(match[1])
            if (Number.isSafeInteger(count)) sample = { count, at: now() }
          }
        }
        discard = false
      }
      if (pending.length > 16384) {
        pending = ''
        discard = true
      }
    },
    count() {
      return sample && now() - sample.at < 30_000 ? sample.count : null
    },
  }
}

async function noOutgoingPeers(
  effects: import('@start9labs/start-sdk').T.Effects,
  config: import('./fileModels/rbitcoin.conf').NodeConfig,
  prefs: import('./fileModels/store.json').Store,
) {
  const needsTor =
    prefs.outgoingRouting === 'tor' ||
    (config.only_net.length > 0 &&
      config.only_net.every((n) => n === 'onion')) ||
    (config.connect.length > 0 &&
      config.connect.every((p) => p.toLowerCase().includes('.onion:')))
  if (needsTor) {
    const status = await sdk.getStatus(effects, { packageId: 'tor' }).once()
    if (!status || status.desired.main !== 'running' || status.error)
      return {
        result: 'failure' as const,
        message: i18n(
          'Tor is unavailable. Install or start Tor to connect to peers.',
        ),
      }
  }
  return {
    result: 'failure' as const,
    message: i18n('No outgoing peers connected. Check peer settings and logs.'),
  }
}

export async function checkPeers(
  effects: import('@start9labs/start-sdk').T.Effects,
  sub: {
    execFail(
      command: string[],
      options: { timeout: number },
    ): Promise<{ stdout: string | Buffer }>
  },
  config: import('./fileModels/rbitcoin.conf').NodeConfig,
  prefs: import('./fileModels/store.json').Store,
  i2pAvailable: boolean,
  initialSyncPeers: ReturnType<typeof observeInitialSyncPeers>,
) {
  let ready: Response
  let reason = ''
  try {
    // The RPC snapshot excludes fast IBD peers. Check its scope before using it.
    ready = await fetch(`http://127.0.0.1:${ports.health}/readyz`, {
      signal: timeout(),
    })
    if (ready.status === 503) {
      reason = (await ready.text()).trim().replace(/^not ready: /, '')
      if (['opening', 'starting', 'stopping'].includes(reason))
        return {
          result: 'starting' as const,
          message: i18n('Connecting to peers'),
        }
      if (reason === 'catch-up') {
        if (!['info', 'debug', 'trace'].includes(config.log_level))
          return {
            result: 'disabled' as const,
            message: i18n('Initial sync peer reporting requires Info logging'),
          }
        const count = initialSyncPeers.count()
        if (count === null)
          return {
            result: 'starting' as const,
            waiting: true,
            message: i18n('Unable to read initial sync peer count'),
          }
        if (count === 0)
          return {
            result: 'starting' as const,
            waiting: true,
            message: i18n('Connecting to peers'),
          }
        return {
          result: 'success' as const,
          message: i18n('${outgoing} outgoing peers for initial sync', {
            outgoing: count,
          }),
        }
      }
    } else if (!ready.ok) throw new Error('readiness unavailable')
  } catch {
    return {
      result: 'failure' as const,
      message: i18n('Unable to read peer connections. Check the logs.'),
    }
  }
  try {
    const { stdout } = await sub.execFail(
      ['rbitcoin-cli', '--rpc-socket', '/data/datadir/rpc.sock', 'getpeerinfo'],
      { timeout: 5000 },
    )
    const peers: unknown = JSON.parse(stdout.toString())
    if (
      !Array.isArray(peers) ||
      peers.some((p) => !p || typeof p.inbound !== 'boolean')
    )
      throw new Error('invalid peer info')
    const incoming = peers.filter((p) => p.inbound).length
    const outgoing = peers.length - incoming
    if (outgoing === 0) {
      if (reason === 'indexing' || reason === 'initial block download')
        return {
          result: 'starting' as const,
          waiting: true,
          message:
            reason === 'indexing'
              ? i18n('Waiting for indexing to finish')
              : i18n('Connecting to peers'),
        }
      return await noOutgoingPeers(effects, config, prefs)
    }
    const counts = i18n('${incoming} incoming, ${outgoing} outgoing peers', {
      incoming,
      outgoing,
    })
    return {
      result: 'success' as const,
      message:
        prefs.i2pEnabled &&
        prefs.outgoingRouting === 'standard' &&
        !i2pAvailable
          ? i18n('${peers}. I2P is unavailable.', { peers: counts })
          : counts,
    }
  } catch {
    if (reason === 'indexing')
      return {
        result: 'starting' as const,
        waiting: true,
        message: i18n('Waiting for indexing to finish'),
      }
    return {
      result: 'failure' as const,
      message: i18n('Unable to read peer connections. Check the logs.'),
    }
  }
}
