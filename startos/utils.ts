import * as fs from 'node:fs/promises'
import { isIP } from 'node:net'
import { sdk } from './sdk'
import { i18n } from './i18n'
import {
  NodeConfig,
  configShape,
  serializeConfig,
} from './fileModels/rbitcoin.conf'
import { Store } from './fileModels/store.json'

export const recoveryRequest = sdk.volumes.startos.subpath('recovery.request')

export function healthReportingEffects(
  effects: import('@start9labs/start-sdk').T.Effects,
): typeof effects {
  return {
    ...effects,
    setHealth: (health) => {
      return effects.setHealth(
        health.message == null
          ? health
          : {
              ...health,
              message: health.message.trimEnd().replace(/(?<!\.)\.$/u, ''),
            },
      )
    },
  }
}

export async function pendingRecovery(): Promise<string | null> {
  try {
    return await fs.readlink(recoveryRequest)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  }
}

export async function hasPrunedStore(): Promise<boolean> {
  return (
    (await pendingRecovery()) !== 'resync' &&
    (await exists(sdk.volumes.main.subpath('datadir/store/seqsigwit.prune')))
  )
}

export const ports = {
  peer: 8333,
  rpc: 8332,
  electrum: 50001,
  esplora: 3000,
  health: 9332,
  sv2: 8442,
}

export async function exists(path: string): Promise<boolean> {
  try {
    await fs.stat(path)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return false
    throw error
  }
}

// Matches v0.9.0's parse_permission_flags, before validating the target below.
function permissionTarget(grant: string): string {
  const value = grant.trim()
  const at = value.indexOf('@')
  if (at < 0) return value
  let hasPermission = false
  let hasDirection = false
  for (const flag of value.slice(0, at).split(',')) {
    if (
      [
        'bloomfilter',
        'bloom',
        'noban',
        'forcerelay',
        'mempool',
        'download',
        'all',
        'relay',
        'addr',
      ].includes(flag)
    ) {
      hasPermission = true
    } else if (flag === 'in' || flag === 'out') {
      hasDirection = true
    } else if (flag !== '') {
      throw new Error(
        i18n('Invalid peer permission. Check the permission names.'),
      )
    }
  }
  if (hasDirection && !hasPermission)
    throw new Error(i18n('Add a permission alongside in or out.'))
  return value.slice(at + 1)
}

function isSubnet(value: string): boolean {
  const slash = value.lastIndexOf('/')
  const host = (slash < 0 ? value : value.slice(0, slash)).replace(
    /^[\[\]]+|[\[\]]+$/g,
    '',
  )
  const family = isIP(host)
  if (!family) return false
  if (slash < 0) return true
  const prefix = value.slice(slash + 1)
  return (
    /^\+?[0-9]+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128)
  )
}

export async function validateConfig(next: NodeConfig): Promise<void> {
  serializeConfig(next)
  if (!Number.isInteger(next.mempool_size_mb) || next.mempool_size_mb < 1)
    throw new Error(i18n('Mempool budget must be at least 1.'))
  for (const grant of next.net_permission) {
    if (grant.trim() && !isSubnet(permissionTarget(grant)))
      throw new Error(
        i18n('Use an IP address or CIDR range for peer permissions.'),
      )
  }
  if (!next.prune_seqsigwit && (await hasPrunedStore()))
    throw new Error(i18n('This store is pruned. Keep pruning on.'))
  if (
    next.only_net.some((net) => !['ipv4', 'ipv6', 'onion', 'i2p'].includes(net))
  )
    throw new Error(
      i18n('Choose IPv4, IPv6, Tor, or I2P for automatic peer connections.'),
    )
  if (next.rest && !next.rpc_listen)
    throw new Error(
      i18n('Enable JSON-RPC over TCP before enabling Core-style REST.'),
    )
  if (next.esplora_block_template && !next.esplora_listen)
    throw new Error(i18n('Enable Esplora before serving its block templates.'))
  if (next.sv2_tp_listen && !next.sv2_tp_authority_sec)
    throw new Error(
      i18n(
        'Set a Stratum v2 authority secret before enabling the template provider.',
      ),
    )
  const secret = next.sv2_tp_authority_sec
  if (
    secret &&
    (!/^[0-9a-fA-F]{64}$/.test(secret) ||
      BigInt('0x' + secret) === 0n ||
      BigInt('0x' + secret) >=
        BigInt(
          '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
        ))
  )
    throw new Error(
      i18n('Enter a valid secp256k1 secret as 64 hex characters.'),
    )
  for (const fee of [next.min_relay_tx_fee, next.block_min_tx_fee]) {
    if (!/^(?:[0-9]+(?:\.[0-9]{1,8})?|\.[0-9]{1,8})$/.test(fee))
      throw new Error(
        i18n(
          'Fees must be nonnegative BTC per kvB with at most eight decimal places.',
        ),
      )
  }
}

export function processEnvironment(store: Store): Record<string, string> {
  const env: Record<string, string> = {}
  if (store.ioBackend !== 'auto') env.RBITCOIN_IO = store.ioBackend
  return env
}

export function runtimeConfig(
  config: NodeConfig,
  network: Record<string, unknown> = {},
): string {
  const supported = Object.fromEntries(
    Object.entries(config).filter(([key]) =>
      Object.hasOwn(configShape.shape, key),
    ),
  )
  return serializeConfig({ ...configShape.parse(supported), ...network })
}

export function nodeArguments(config: NodeConfig): string[] {
  const args = [
    '--conf',
    '/etc/rbitcoin.conf',
    '--network',
    'mainnet',
    '--datadir',
    '/data/datadir',
    '--health-listen',
    '0.0.0.0:9332',
    '--rpc',
  ]
  if (config.rpc_listen)
    args.push(
      '--rpc-token-file',
      '/data/datadir/rpc.token',
      '--rpc-cookie-file',
      '/data/datadir/rpc.cookie',
      '--rpc-cookie-perms',
      'owner',
    )
  return args
}

export function readinessMessage(body: string): string {
  const reason = body.trim().replace(/^not ready: /, '')
  switch (reason) {
    case 'opening':
      return i18n('Opening store')
    case 'starting':
      return i18n('Starting')
    case 'catch-up':
    case 'initial block download':
      return i18n('Syncing...')
    case 'indexing':
      return i18n('Indexing')
    case 'stopping':
      return i18n('Stopping')
    case 'busy':
      return i18n('Busy')
  }
  if (/^tip stale \(last block [0-9]+s ago\)$/.test(reason))
    return i18n('Tip is stale')
  const behind = /^tip ([0-9]+) blocks behind headers$/.exec(reason)
  if (behind)
    return i18n('${blocks} blocks behind', { blocks: Number(behind[1]) })
  const index = /^scripthash index ([0-9]+) blocks behind tip$/.exec(reason)
  if (index)
    return i18n('Address index is ${blocks} blocks behind', {
      blocks: Number(index[1]),
    })
  return i18n('Not ready')
}

export function syncProgressMessage(info: unknown): string | null {
  if (!info || typeof info !== 'object') return null
  const { blocks, headers } = info as { blocks?: unknown; headers?: unknown }
  if (
    typeof blocks !== 'number' ||
    typeof headers !== 'number' ||
    !Number.isSafeInteger(blocks) ||
    !Number.isSafeInteger(headers) ||
    blocks < 0 ||
    headers <= 0 ||
    blocks >= headers
  )
    return null
  return i18n('Syncing... ${percent}% (${blocks} / ${headers} blocks)', {
    percent: ((blocks / headers) * 100).toFixed(1),
    blocks,
    headers,
  })
}

export function mibToBytes(value: number): number {
  const bytes = value * 1048576
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error(i18n('Enter a cache size in whole bytes.'))
  return bytes
}

export function feeToSatVb(value: string): string {
  const [whole, fraction = ''] = value.split('.')
  const sats =
    BigInt(whole || '0') * 100000000n + BigInt(fraction.padEnd(8, '0'))
  const decimals = String(sats % 1000n)
    .padStart(3, '0')
    .replace(/0+$/, '')
  return `${sats / 1000n}${decimals ? `.${decimals}` : ''}`
}

export function feeFromSatVb(value: string | number): string {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(String(value).trim())
  if (!match)
    throw new Error(i18n('Enter a fee in sat/vB with up to 3 decimal places.'))
  const sats =
    BigInt(match[1]) * 1000n + BigInt((match[2] || '').padEnd(3, '0'))
  return `${sats / 100000000n}.${String(sats % 100000000n).padStart(8, '0')}`
}

export function rpcCredentials(store: Pick<Store, 'rpcPassword' | 'rpcToken'>) {
  if (!store.rpcPassword || !store.rpcToken)
    throw new Error(i18n('Generate RPC credentials first.'))
  return {
    version: '1' as const,
    title: i18n('RPC credentials'),
    message: i18n(
      'Use the password with HTTP Basic, or the token with Bearer authentication.',
    ),
    result: {
      type: 'group' as const,
      value: [
        { name: i18n('Username'), value: 'rbitcoin', masked: false },
        { name: i18n('Password'), value: store.rpcPassword, masked: true },
        { name: i18n('Bearer token'), value: store.rpcToken, masked: true },
      ].map((field) => ({
        ...field,
        type: 'single' as const,
        copyable: true,
        qr: false,
        launchable: false,
        description: null,
      })),
    },
  }
}

export function readinessResult(body: string, elapsed: number) {
  const message = readinessMessage(body)
  const stalled =
    message === i18n('Busy') ||
    message === i18n('Tip is stale') ||
    message === i18n('Not ready')
  if (stalled && elapsed >= 300_000)
    return {
      result: 'failure' as const,
      message: i18n('Not ready. Check peers and logs.'),
    }
  return { result: 'loading' as const, message }
}

export function feeToInput(value: string): number {
  const display = feeToSatVb(value)
  const numeric = Number(display)
  try {
    if (feeFromSatVb(numeric) === feeFromSatVb(display)) return numeric
  } catch {}
  throw new Error(i18n('Fee cannot be represented exactly in this input.'))
}
