import { WorkflowAssignment } from '../types/workflow'

const CANONICAL_WORKFLOWS: WorkflowAssignment[] = [
  'inquiry_match',
  'inquiry_only',
  'lead_scoring',
  'contract_creation',
  'schedule_creation',
  'notification_only',
  'validation_error',
  'human_review',
]

const LEGACY_WORKFLOW_MAP: Record<string, WorkflowAssignment> = {
  maid_matching: 'inquiry_match',
  general_inquiry: 'inquiry_only',
  inquiry: 'inquiry_only',
}

const isCanonicalWorkflow = (workflow: string): workflow is WorkflowAssignment =>
  CANONICAL_WORKFLOWS.includes(workflow as WorkflowAssignment)

export const normalizeWorkflow = (workflow: string): WorkflowAssignment => {
  if (workflow === 'human_review') {
    return 'human_review'
  }

  const normalized = LEGACY_WORKFLOW_MAP[workflow] ?? workflow
  if (isCanonicalWorkflow(normalized)) {
    return normalized
  }

  throw new Error(`INVALID_WORKFLOW:${workflow}`)
}

const containsLegacyWorkflow = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => containsLegacyWorkflow(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => {
      if (key === 'workflow' && typeof item === 'string') {
        return item === 'general_inquiry' || item === 'maid_matching' || item === 'inquiry'
      }
      return containsLegacyWorkflow(item)
    })
  }

  return false
}

export const assertNoLegacyWorkflowResponse = (
  payload: unknown,
  runtime: 'production' | 'development'
) => {
  if (runtime !== 'production') return
  if (containsLegacyWorkflow(payload)) {
    throw new Error('LEGACY_WORKFLOW_LEAK_DETECTED')
  }
}
