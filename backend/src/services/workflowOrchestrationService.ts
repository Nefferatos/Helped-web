import { getDirectSalesStore, getEmployerContractsStore, getMaidsStore } from '../store'
import {
  createWorkflowContractStore,
  createWorkflowLeadStore,
  createWorkflowScheduleStore,
  getWorkflowSnapshotStore,
  listWorkflowLeadsStore,
} from '../store/workflowStore'
import { MatchCriteria, StructuredLeadInput } from '../types/workflow'
import {
  enrichLeadWithAi,
  generateContractDraftWithAi,
  qualifyLeadWithAi,
} from './workflowAiService'
import { processInquiryWithAiOrchestrator } from './aiOrchestratorService'
import { logWorkflowStep } from './workflowLoggerService'
import { runMatchingWorkflow } from './workflowMatchingService'
import { sendToMakeWebhook } from './workflowMakeService'
import { sendWorkflowNotification } from './workflowNotificationService'

export const createStructuredLead = async (payload: StructuredLeadInput) => {
  const lead = await createWorkflowLeadStore(payload)
  await logWorkflowStep({
    workflow: 'lead_pipeline',
    step: 'lead_stored',
    status: 'success',
    message: `Structured lead ${lead.id} stored`,
    payload: { leadId: lead.id, classification: lead.classification },
  })
  return lead
}

export const processRawLead = async (payload: {
  source: StructuredLeadInput['source']
  message: string
  name: string
  contact: string
}) => {
  await logWorkflowStep({
    workflow: 'lead_pipeline',
    step: 'ingest',
    status: 'success',
    message: 'Raw lead received',
    payload,
  })

  const enrichment = await enrichLeadWithAi({
    message: payload.message,
    name: payload.name,
  })

  await logWorkflowStep({
    workflow: 'lead_pipeline',
    step: 'enrichment',
    status: enrichment.aiUsed ? 'success' : 'warning',
    message: enrichment.aiUsed
      ? 'Lead enrichment completed with AI'
      : 'Lead enrichment used fallback rules',
    payload: enrichment.data,
  })

  const qualification = await qualifyLeadWithAi({
    ...payload,
    enrichment: enrichment.data,
  })

  await logWorkflowStep({
    workflow: 'lead_pipeline',
    step: 'qualification',
    status: qualification.aiUsed ? 'success' : 'warning',
    message: qualification.aiUsed
      ? 'Lead qualification completed with AI'
      : 'Lead qualification used fallback rules',
    payload: qualification.data,
  })

  const lead = await createStructuredLead({
    ...payload,
    ...enrichment.data,
    score: qualification.data.score,
    classification: qualification.data.classification,
    aiSummary: enrichment.data.summary,
    qualificationReasons: qualification.data.reasons,
  })

  const notification = await sendWorkflowNotification({
    channel: 'internal',
    recipient: 'sales-team',
    message: `New ${lead.classification} lead received from ${lead.source}: ${lead.name}`,
    referenceType: 'lead',
    referenceId: String(lead.id),
  })

  return {
    lead,
    enrichment: enrichment.data,
    qualification: qualification.data,
    notification: notification.notification,
    aiUsed: enrichment.aiUsed || qualification.aiUsed,
  }
}

export const processInquiryWorkflow = async (payload: {
  message: string
  name: string
  contact: string
  employerId?: number
}) => {
  const result = await processInquiryWithAiOrchestrator(payload)

  const buildProfileUrl = (referenceCode: string) => {
    const baseUrl =
      process.env.MAID_PROFILE_BASE_URL?.trim() || process.env.PUBLIC_URL?.trim() || ''
    const path = `/maids/${encodeURIComponent(referenceCode)}`
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path
  }

  const shouldAutoTriggerMake =
    result.workflow === 'make_pipeline' || process.env.MAKE_AUTO_TRIGGER === 'true'

  if (shouldAutoTriggerMake) {
    try {
      const makePayload = {
        event: 'inquiry.processed',
        inquiryId: result.inquiry.id,
        intent: result.inquiry.intent,
        workflow: result.inquiry.workflow,
        aiUsed: result.inquiry.aiUsed,
        matches: (result.matches ?? []).map((match) => ({
          ...match,
          profileUrl: buildProfileUrl(match.maidReferenceCode),
        })),
        reply: result.reply,
        name: payload.name,
        contact: payload.contact,
        message: payload.message,
        employerId: payload.employerId ?? null,
        source: 'agent',
        channel: 'orchestrator',
        conversationId: null,
        messageId: null,
        receivedAt: new Date().toISOString(),
        metadata: {},
      }

      const scenario = process.env.MAKE_SCENARIO?.trim() || 'inquiry_pipeline'
      await sendWorkflowToMake({ scenario, payload: makePayload })
    } catch (error) {
      // swallow - sendWorkflowToMake logs delivery records; no further action required here
    }
  }

  return result
}

export const runDirectMatchingWorkflow = async (criteria: MatchCriteria) => {
  return await runMatchingWorkflow(criteria)
}

export const scheduleInterviewWorkflow = async (payload: {
  maidId: number
  employerId: number
  datetime: string
}) => {
  const maids = await getMaidsStore()
  const maid = maids.find((item) => item.id === payload.maidId)
  if (!maid) {
    throw new Error('MAID_NOT_FOUND')
  }

  const schedule = await createWorkflowScheduleStore(payload)

  await sendWorkflowNotification({
    channel: 'internal',
    recipient: `employer:${payload.employerId}`,
    message: `Interview scheduled with maid ${maid.fullName} on ${payload.datetime}`,
    referenceType: 'schedule',
    referenceId: String(schedule.id),
  })

  await sendWorkflowNotification({
    channel: 'internal',
    recipient: `maid:${payload.maidId}`,
    message: `Interview scheduled with employer ${payload.employerId} on ${payload.datetime}`,
    referenceType: 'schedule',
    referenceId: String(schedule.id),
  })

  await logWorkflowStep({
    workflow: 'matching_pipeline',
    step: 'schedule',
    status: 'success',
    message: `Interview ${schedule.id} scheduled`,
    payload: schedule,
  })

  return schedule
}

export const generateContractWorkflow = async (payload: {
  maidId: number
  employerId: number
  serviceType?: string
  location?: string
  budgetText?: string
  scheduleDate?: string
}) => {
  const draft = await generateContractDraftWithAi({
    maidId: payload.maidId,
    employerId: payload.employerId,
    serviceType: payload.serviceType ?? 'general_housekeeping',
    location: payload.location ?? 'Singapore',
    budgetText: payload.budgetText ?? '',
    scheduleDate: payload.scheduleDate ?? '',
  })

  const contract = await createWorkflowContractStore({
    maidId: payload.maidId,
    employerId: payload.employerId,
    contractText: draft.data.contractText,
    summary: draft.data.summary,
  })

  await logWorkflowStep({
    workflow: 'matching_pipeline',
    step: 'contract_generation',
    status: draft.aiUsed ? 'success' : 'warning',
    message: `Contract ${contract.id} generated`,
    payload: { contractId: contract.id, aiUsed: draft.aiUsed },
  })

  return {
    contract,
    aiUsed: draft.aiUsed,
  }
}

export const sendNotificationWorkflow = async (payload: Parameters<typeof sendWorkflowNotification>[0]) => {
  const result = await sendWorkflowNotification(payload)

  await logWorkflowStep({
    workflow: 'notification_pipeline',
    step: 'notify',
    status: 'success',
    message: `Notification sent to ${payload.recipient}`,
    payload,
  })

  return result
}

export const sendMessageWorkflow = async (payload: {
  recipient: string
  message: string
  channel?: 'email' | 'sms' | 'whatsapp' | 'internal'
}) => {
  return await sendNotificationWorkflow({
    channel: payload.channel ?? 'internal',
    recipient: payload.recipient,
    message: payload.message,
    referenceType: 'message',
    referenceId: '',
  })
}

export const sendWorkflowToMake = async (payload: {
  scenario: string
  payload: Record<string, unknown>
  url?: string
}) => {
  const result = await sendToMakeWebhook(payload)

  await logWorkflowStep({
    workflow: 'make_pipeline',
    step: 'webhook',
    status: result.ok ? 'success' : 'failed',
    message: result.ok
      ? `Make scenario ${payload.scenario} triggered`
      : `Make scenario ${payload.scenario} failed`,
    payload: result.delivery,
  })

  return result
}

export const getWorkflowDashboard = async () => {
  const [workflow, leads, directSales, employmentContracts, maids] =
    await Promise.all([
      getWorkflowSnapshotStore(),
      listWorkflowLeadsStore(),
      getDirectSalesStore(),
      getEmployerContractsStore(),
      getMaidsStore(),
    ])

  return {
    totalLeads: leads.length,
    highPriorityLeads: leads.filter((lead) => lead.classification === 'HIGH').length,
    matchesMade: workflow.matches.length,
    activeContracts: workflow.contracts.length + employmentContracts.length,
    interviewsScheduled: workflow.schedules.length,
    notificationsSent: workflow.notifications.length,
    makeDeliveries: workflow.makeDeliveries.length,
    availableMaids: maids.filter((maid) => maid.status === 'available').length,
    directSales: directSales.length,
  }
}
