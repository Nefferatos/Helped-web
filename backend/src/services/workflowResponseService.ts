import { WorkflowAssignment } from '../types/workflow'
import { normalizeWorkflow } from './workflowNameService'

export interface WorkflowApiResponse<T = Record<string, unknown>> {
  workflow: WorkflowAssignment
  intent: string
  fallbackUsed: boolean
  fallbackProvider?: string | null
  data: T
}

const runtime = () => (process.env.NODE_ENV === 'production' ? 'production' : 'development')

const normalizeIntent = (intent: string | null | undefined, workflow: WorkflowAssignment) => {
  if (intent?.trim()) {
    return intent
  }

  switch (workflow) {
    case 'inquiry_match':
      return 'hiring'
    case 'inquiry_only':
      return 'inquiry'
    case 'human_review':
      return 'complaint'
    case 'lead_scoring':
      return 'lead'
    case 'contract_creation':
      return 'contract'
    case 'schedule_creation':
      return 'schedule'
    case 'notification_only':
      return 'notification'
    case 'validation_error':
      return 'validation_error'
    default:
      return 'system'
  }
}

const normalizeFallbackUsed = (fallbackUsed: boolean | null | undefined) => {
  if (typeof fallbackUsed === 'boolean') {
    return fallbackUsed
  }
  return false
}

export const buildWorkflowResponse = <T>(payload: {
  workflow: string | null | undefined
  intent?: string | null
  fallbackUsed?: boolean | null
  fallbackProvider?: string | null
  data: T
}): WorkflowApiResponse<T> => {
  try {
    const workflow = normalizeWorkflow(payload.workflow ?? '')
    return {
      workflow,
      intent: normalizeIntent(payload.intent, workflow),
      fallbackUsed: normalizeFallbackUsed(payload.fallbackUsed),
      fallbackProvider: payload.fallbackProvider ?? null,
      data: payload.data,
    }
  } catch (error) {
    if (runtime() !== 'production') {
      throw error
    }

    return {
      workflow: 'validation_error',
      intent: 'validation_error',
      fallbackUsed: true,
      fallbackProvider: payload.fallbackProvider ?? 'contract_guard',
      data: payload.data,
    }
  }
}
