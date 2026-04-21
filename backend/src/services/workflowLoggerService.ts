import { createWorkflowAutomationLogStore } from '../store/workflowStore'
import { AutomationStatus } from '../types/workflow'

const truncate = (value: unknown) => {
  try {
    const serialized = JSON.stringify(value)
    if (!serialized) return undefined
    return serialized.length > 3000
      ? ({ preview: `${serialized.slice(0, 3000)}...` } as Record<string, unknown>)
      : (JSON.parse(serialized) as Record<string, unknown>)
  } catch {
    return { preview: String(value) }
  }
}

export const logWorkflowStep = async (payload: {
  workflow: string
  step: string
  status: AutomationStatus
  message: string
  payload?: unknown
}) => {
  const entry = {
    workflow: payload.workflow,
    step: payload.step,
    status: payload.status,
    message: payload.message,
    payload: truncate(payload.payload),
  }

  const printer =
    payload.status === 'failed'
      ? console.error
      : payload.status === 'warning'
      ? console.warn
      : console.log

  printer(
    `[workflow:${payload.workflow}] ${payload.step} ${payload.status} - ${payload.message}`
  )

  await createWorkflowAutomationLogStore(entry)
}
