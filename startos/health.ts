import { connect } from 'node:net'
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
    } catch {
      /* node readiness is not available yet */
    }
    return {
      result: 'loading' as const,
      message: i18n('API unavailable. Check the logs.'),
    }
  }
}
