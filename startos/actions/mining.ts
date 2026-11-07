import { NodeConfig } from '../fileModels/rbitcoin.conf'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { nodeConfig } from '../fileModels/rbitcoin.conf'
import { validateConfig } from '../utils'

const { InputSpec, Value, Variants } = sdk
export const mining = sdk.Action.withInput(
  'mining',
  {
    name: i18n('Mining'),
    description: i18n('Saving restarts a running node.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Clients and mining'),
    visibility: 'enabled',
  },
  async () => {
    const config = await nodeConfig.read().once()
    return InputSpec.of({
      esplora_block_template: Value.toggle({
        name: i18n('Serve block templates through Esplora'),
        default: false,
      }),
      block_min_tx_fee: Value.text({
        name: i18n('Minimum template fee (BTC per kvB)'),
        required: true,
        default: '0.00000001',
        masked: false,
      }),
      sv2: Value.union({
        name: i18n('Stratum v2 template provider'),
        default: 'disabled',
        variants: Variants.of({
          disabled: { name: i18n('Disabled'), spec: InputSpec.of({}) },
          enabled: {
            name: i18n('Enabled'),
            spec: InputSpec.of({
              authority: Value.text({
                name: i18n('Stratum v2 authority secret (64 hex characters)'),
                required: true,
                default: config?.sv2_tp_authority_sec ?? null,
                masked: true,
                generate: { charset: 'a-f,0-9', len: 64 },
              }),
            }),
          },
        }),
      }),
    })
  },
  async () => {
    const value = await nodeConfig.read().once()
    if (!value) return {}
    return {
      esplora_block_template: value.esplora_block_template,
      block_min_tx_fee: value.block_min_tx_fee,
      sv2: value.sv2_tp_listen
        ? {
            selection: 'enabled' as const,
            value: { authority: value.sv2_tp_authority_sec ?? undefined },
          }
        : { selection: 'disabled' as const, value: {} },
    }
  },
  async ({ effects, input }) => {
    await nodeConfig.update(effects, async (current) => {
      if (!current) throw new Error(i18n('Configuration is not initialized.'))
      const next: NodeConfig = {
        ...current,
        esplora_block_template: input.esplora_block_template,
        block_min_tx_fee: input.block_min_tx_fee.trim(),
        sv2_tp_listen:
          input.sv2.selection === 'enabled' ? '0.0.0.0:8442' : null,
        sv2_tp_authority_sec:
          input.sv2.selection === 'enabled'
            ? input.sv2.value.authority.trim()
            : current.sv2_tp_authority_sec,
      }
      await validateConfig(next)
      return next
    })
    return {
      version: '1',
      title: i18n('Settings saved'),
      message: null,
      result: null,
    }
  },
)
