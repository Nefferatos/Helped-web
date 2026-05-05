import { randomUUID } from 'crypto'
import { createWorkflowInquiryStore } from '../store/workflowStore'
import { classifyInquiryWithAi } from './workflowAiService'
import { logWorkflowDecision, logWorkflowStep } from './workflowLoggerService'
import { runMatchingWorkflow } from './workflowMatchingService'
import { normalizeWorkflow } from './workflowNameService'

export const processInquiryWithAiOrchestrator = async (payload: {
  message: string
  name: string
  contact: string
  employerId?: number
  requestId?: string
}) => {
  const requestId = payload.requestId || randomUUID()
  const startedAt = Date.now()

  await logWorkflowStep({
    workflow: 'inquiry_pipeline',
    step: 'ingest',
    status: 'success',
    message: 'Inquiry received',
    payload: { ...payload, requestId },
  })

  const classified = await classifyInquiryWithAi({
    message: payload.message,
    name: payload.name,
  })
  const workflow = normalizeWorkflow(classified.data.workflow)

  const inquiry = await createWorkflowInquiryStore({
    name: payload.name,
    contact: payload.contact,
    message: payload.message,
    intent: classified.data.intent,
    workflow,
    reply: classified.data.reply,
    aiUsed: classified.aiUsed,
  })

  await logWorkflowStep({
    workflow: 'inquiry_pipeline',
    step: 'classification',
    status: classified.aiUsed ? 'success' : 'warning',
    message: `Inquiry classified as ${classified.data.intent}`,
    payload: {
      ...classified.data,
      workflow,
      fallbackProvider: classified.fallbackProvider ?? null,
    },
  })

  let matches:
    | Awaited<ReturnType<typeof runMatchingWorkflow>>['matches']
    | undefined
  let fallbackUsed = !classified.aiUsed

  if (classified.data.intent === 'hiring') {
    const result = await runMatchingWorkflow({
      inquiryId: inquiry.id,
      employerId: payload.employerId,
      message: payload.message,
    })
    matches = result.matches
    fallbackUsed = fallbackUsed || result.fallbackUsed

    await logWorkflowStep({
      workflow: 'inquiry_pipeline',
      step: 'inquiry_match',
      status: result.matches.length > 0 ? 'success' : 'warning',
      message: `Generated ${result.matches.length} match candidates`,
      payload: {
        inquiryId: inquiry.id,
        aiUsed: result.aiUsed,
        vectorSearch: result.vectorSearch,
      },
    })
  }

  await logWorkflowDecision({
    requestId,
    workflow,
    classifierOutput: { ...classified.data, workflow },
    endpointCalled: classified.data.intent === 'hiring' ? '/api/match' : '/api/inquiry',
    status: 'success',
    latency: Date.now() - startedAt,
    fallbackUsed,
  })

  return {
    requestId,
    inquiry,
    matches,
    reply: classified.data.reply,
    workflow,
    classifier: { ...classified.data, workflow },
    fallbackUsed,
    fallbackProvider: classified.fallbackProvider ?? null,
  }
}
