import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const singleLine = z.string().refine((s) => !/[\r\n\0]/.test(s))

export const configShape = z.looseObject({
  network: z.literal('mainnet').catch('mainnet'),
  sh_index: z.boolean().catch(false),
  block_filter_index: z.boolean().catch(false),
  sp_tweaks: z.boolean().catch(false),
  sp_tweaks_dust: z.number().int().min(0).max(4294967295).catch(1000),
  prune_seqsigwit: z.boolean().catch(false),
  prune_seqsigwit_ram_threshold_bytes: z
    .number()
    .int()
    .min(0)
    .max(9007199254740991)
    .catch(268435456),
  datadir_hdd: z.boolean().catch(false),
  max_outbound: z.number().int().min(1).max(4294967295).catch(16),
  max_inbound: z.number().int().min(0).max(4294967295).catch(200),
  connect: z.array(singleLine).catch([]),
  only_net: z.array(z.enum(['ipv4', 'ipv6', 'onion', 'i2p'])).default([]),
  mempool_size_mb: z.number().int().min(1).max(4294967295).catch(300),
  mempool_expiry: z.number().int().min(1).max(4294967295).catch(336),
  persist_mempool: z.boolean().catch(true),
  blocks_only: z.boolean().catch(false),
  min_relay_tx_fee: singleLine.min(1).catch('0.00000100'),
  net_permission: z.array(singleLine).catch([]),
  rpc_listen: z.literal('0.0.0.0:8332').nullable().catch(null),
  electrum_listen: z.literal('0.0.0.0:50001').nullable().catch(null),
  esplora_listen: z.literal('0.0.0.0:3000').nullable().catch(null),
  rest: z.boolean().catch(false),
  metrics: z.boolean().catch(false),
  rpc_work_queue: z.number().int().min(0).max(4294967295).catch(16),
  electrum_max_subs: z.number().int().min(1).max(4294967295).catch(10000),
  esplora_max_inflight: z.number().int().min(1).max(4294967295).catch(256),
  max_sh_creates: z.number().int().min(0).max(4294967295).catch(10000),
  heavy_sh_creates: z.number().int().min(0).max(4294967295).catch(10000),
  store_read_budget: z.number().int().min(0).max(4294967295).catch(0),
  esplora_block_template: z.boolean().catch(false),
  block_min_tx_fee: singleLine.min(1).catch('0.00000001'),
  sv2_tp_listen: z.literal('0.0.0.0:8442').nullable().catch(null),
  sv2_tp_authority_sec: singleLine.nullable().catch(null),
  log_level: z
    .enum(['error', 'warn', 'info', 'debug', 'trace', 'off'])
    .catch('info'),
  api_log: z.literal('/data/datadir/api.jsonl').nullable().catch(null),
})
export type NodeConfig = z.infer<typeof configShape>

const booleanKeys = new Set([
  'sh_index',
  'block_filter_index',
  'sp_tweaks',
  'prune_seqsigwit',
  'datadir_hdd',
  'no_seeds',
  'no_discover',
  'proxy_randomize',
  'cjdns_reachable',
  'persist_mempool',
  'blocks_only',
  'rest',
  'metrics',
  'esplora_block_template',
])
const numberKeys = new Set([
  'sp_tweaks_dust',
  'prune_seqsigwit_ram_threshold_bytes',
  'max_outbound',
  'max_inbound',
  'mempool_size_mb',
  'mempool_expiry',
  'rpc_work_queue',
  'electrum_max_subs',
  'esplora_max_inflight',
  'max_sh_creates',
  'heavy_sh_creates',
  'store_read_budget',
])
const listKeys = new Set([
  'connect',
  'seed_node',
  'external_ip',
  'only_net',
  'net_permission',
])

export function parseConfig(raw: string): unknown {
  const values: Record<string, unknown> = {}
  for (const line of raw.split('\n')) {
    const text = line.trim()
    if (!text || text.startsWith('#') || text.startsWith(';')) continue
    const separator = text.indexOf('=')
    if (separator < 1) throw new Error('Invalid rbitcoin.conf line')
    const key = text.slice(0, separator).trim()
    const value = text.slice(separator + 1).trim()
    if (listKeys.has(key)) {
      const previous = values[key]
      values[key] = [...(Array.isArray(previous) ? previous : []), value]
    } else if (booleanKeys.has(key)) {
      const token = value.toLowerCase()
      if (['1', 'true', 'yes', 'on'].includes(token)) values[key] = true
      else if (['0', 'false', 'no', 'off'].includes(token)) values[key] = false
      else values[key] = value
    } else if (numberKeys.has(key)) {
      values[key] = /^[+-]?[0-9]+$/.test(value) ? Number(value) : value
    } else {
      values[key] = value
    }
  }
  return values
}

export function serializeConfig(values: NodeConfig): string {
  const lines: string[] = ['network=mainnet']
  for (const [key, value] of Object.entries(values)) {
    if (key === 'network') continue
    if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new Error('Invalid config key')
    if (value === null || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (
        !['string', 'number', 'boolean'].includes(typeof item) ||
        /[\r\n\0]/.test(String(item))
      ) {
        throw new Error('Invalid config value')
      }
      lines.push(`${key}=${typeof item === 'boolean' ? Number(item) : item}`)
    }
  }
  return lines.join('\n') + '\n'
}

export const nodeConfig = FileHelper.raw(
  { base: sdk.volumes.startos, subpath: 'rbitcoin.conf' },
  serializeConfig,
  parseConfig,
  (value) => configShape.parse(value),
)
