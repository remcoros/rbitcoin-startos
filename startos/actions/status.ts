import { z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { phaseLabel, ports, stageLabel } from '../utils'

const progressShape = z.looseObject({
  phase: z.string(),
  stage: z.string().nullable(),
  done: z.number().nullable().catch(null),
  total: z.number().nullable().catch(null),
  percent: z.number().nullable().catch(null),
  elapsed_secs: z.number().nullable().catch(null),
  eta_secs: z.number().nullable().catch(null),
})

export const status = sdk.Action.withoutInput(
  'status',
  {
    name: i18n('Node status'),
    description: '',
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Status and logs'),
    visibility: 'enabled',
  },
  async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:${ports.health}/progress`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (!response.ok) throw new Error('Progress request failed')
      const progress = progressShape.parse(await response.json())
      const task = stageLabel(progress.stage)
      const fields = [
        { name: i18n('State'), value: phaseLabel(progress.phase) },
        ...(task ? [{ name: i18n('Task'), value: task }] : []),
        ...(progress.percent !== null
          ? [
              {
                name: i18n('Task progress'),
                value: `${progress.percent.toFixed(2)}%`,
              },
            ]
          : []),
        ...(progress.done !== null && progress.total !== null
          ? [
              {
                name: i18n('Completed'),
                value: `${progress.done} / ${progress.total}`,
              },
            ]
          : []),
        ...(progress.elapsed_secs !== null
          ? [
              {
                name: i18n('Elapsed (seconds)'),
                value: String(Math.round(progress.elapsed_secs)),
              },
            ]
          : []),
        ...(progress.eta_secs !== null
          ? [
              {
                name: i18n('Estimated remaining (seconds)'),
                value: String(Math.round(progress.eta_secs)),
              },
            ]
          : []),
      ]
      return {
        version: '1',
        title: i18n('Node status'),
        message: null,
        result: {
          type: 'group',
          value: fields.map((field) => ({
            ...field,
            description: null,
            type: 'single',
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          })),
        },
      }
    } catch {
      throw new Error(i18n('Status unavailable. Check the logs.'))
    }
  },
)
