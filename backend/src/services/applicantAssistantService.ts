import { randomUUID } from 'crypto'
import type { Request } from 'express'
import { getAuthenticatedAgencyAdmin } from '../auth'
import type {
  ApplicantAssistantAction,
  MakeApplicantAssistantRequest,
  MakeApplicantAssistantResponse,
  TrackerItem,
} from '../types/applicantAssistant'
import { listAtsApplications, getAtsApplication } from '../atsStore'
import { sendToMakeWebhook } from './workflowMakeService'
import {
  createConversation, getConversation, addMessageToConversation,
  updateConversationContext, createTracker, getTracker, getActiveTrackerForAgency,
  updateTracker, saveGoogleDocLink, getGoogleDocLinkForTracker,
  isRequestAlreadyProcessed, markRequestProcessed, addAuditRecord,
} from '../store/applicantAssistantStore'

const MAKE_SCENARIO = 'applicant-assistant'

// ─── Applicant Context Builder ─────────────────────────────────────────────

const buildApplicantSummary = async (agencyId: number) => {
  const result = await listAtsApplications(agencyId, { pageSize: 100 })
  const applications = result.data
  const byStage: Record<string, number> = {}
  const byNationality: Record<string, number> = {}
  let totalScore = 0, scoredCount = 0, needingFollowup = 0, recentlyAdded = 0
  const oneDayAgo = Date.now() - 86400000

  for (const app of applications) {
    byStage[app.status] = (byStage[app.status] ?? 0) + 1
    const nat = app.profile?.nationality ?? 'Unknown'
    byNationality[nat] = (byNationality[nat] ?? 0) + 1
    if (app.score?.score) { totalScore += app.score.score; scoredCount++ }
    if (['New Applicant', 'Documents Submitted'].includes(app.status)) needingFollowup++
    if (new Date(app.appliedAt).getTime() > oneDayAgo) recentlyAdded++
  }

  return {
    total: applications.length, byStage, byNationality,
    averageScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
    needingFollowup, recentlyAdded,
  }
}

const sanitizeApplicantForMake = async (agencyId: number, applicationId: string) => {
  try {
    const bundle = await getAtsApplication(agencyId, applicationId)
    if (!bundle) return null
    const { application: app, profile, score, interview, backgroundCheck, documents, history } = bundle
    return {
      id: app.id, applicationCode: app.applicationCode, status: app.status,
      appliedAt: app.appliedAt, source: app.source, aiParseSummary: app.aiParseSummary,
      profile: profile ? {
        fullName: profile.fullName, nationality: profile.nationality, age: profile.age,
        yearsOfExperience: profile.yearsOfExperience, expectedSalary: profile.expectedSalary,
        employmentPreference: profile.employmentPreference, languageSkills: profile.languageSkills,
        cookingSkills: profile.cookingSkills, childcareExperience: profile.childcareExperience,
        elderlyCareExperience: profile.elderlyCareExperience, housekeepingExperience: profile.housekeepingExperience,
        certifications: profile.certifications, availableDate: profile.availableDate,
        strengthsTags: profile.strengthsTags, weaknessesTags: profile.weaknessesTags,
        medicalStatus: profile.medicalStatus, passportStatus: profile.passportStatus,
      } : null,
      score: score ? { score: score.score, category: score.category, strengths: score.strengths, weaknesses: score.weaknesses } : null,
      interview: interview ? { interviewResult: interview.interviewResult, score: interview.score } : null,
      backgroundCheck: backgroundCheck ? { result: backgroundCheck.result } : null,
      documentsStatus: documents.map((d) => ({ type: d.type, status: d.status, required: d.required })),
      recentHistory: history.slice(0, 5).map((h) => ({ toStage: h.toStage, actor: h.actor, reason: h.reason, createdAt: h.createdAt })),
    }
  } catch { return null }
}

// ─── Build Make.com Request ────────────────────────────────────────────────

const buildMakeRequest = async (params: {
  conversationId: string; requestId: string; message: string
  agencyId: number; userId: string; userName: string
  selectedApplicantIds: string[]; currentFilters: Record<string, unknown>
  currentSearch: string; conversationHistory: Array<{ role: string; content: string }>
  trackerId: string | null
}): Promise<MakeApplicantAssistantRequest> => {
  const applicantSummary = await buildApplicantSummary(params.agencyId)
  let selectedApplicant: Record<string, unknown> | null = null
  if (params.selectedApplicantIds.length === 1) {
    selectedApplicant = await sanitizeApplicantForMake(params.agencyId, params.selectedApplicantIds[0])
  }
  const selectedApplicants: Array<Record<string, unknown>> = []
  if (params.selectedApplicantIds.length > 1) {
    for (const id of params.selectedApplicantIds.slice(0, 10)) {
      const sanitized = await sanitizeApplicantForMake(params.agencyId, id)
      if (sanitized) selectedApplicants.push(sanitized)
    }
  }

  let existingTracker = null
  let googleDocId: string | null = null
  const trackerToUse = params.trackerId ? await getTracker(params.trackerId) : await getActiveTrackerForAgency(params.agencyId)
  if (trackerToUse) {
    existingTracker = { id: trackerToUse.id, name: trackerToUse.name, description: trackerToUse.description, itemCount: trackerToUse.items.length, googleDocUrl: trackerToUse.googleDocUrl }
    const docLink = await getGoogleDocLinkForTracker(trackerToUse.id)
    googleDocId = docLink?.documentId ?? null
  }

  return {
    conversationId: params.conversationId, requestId: params.requestId,
    message: params.message, type: 'applicant_assistant',
    context: {
      user: { id: params.userId, name: params.userName, email: '' },
      agency: { id: params.agencyId, name: '' },
      selectedApplicant, selectedApplicants,
      currentFilters: params.currentFilters, currentSearch: params.currentSearch,
      applicantSummary,
    },
    conversationHistory: params.conversationHistory,
    trackerContext: { existingTracker: existingTracker as MakeApplicantAssistantRequest['trackerContext']['existingTracker'], googleDocId },
  }
}

// ─── Tracker Helpers ───────────────────────────────────────────────────────

const getNextAction = (status: string): string => {
  const actions: Record<string, string> = {
    'New Applicant': 'Review profile and advance to Documents Submitted',
    'Documents Submitted': 'Parse resume and review documents',
    'Resume Parsed': 'Schedule screening interview',
    'Screening Interview': 'Complete interview and record results',
    'Background Check': 'Verify background and references',
    'Approved': 'Configure public profile for matching',
    'Ready to Configure Public Profile': 'Create maid profile and post',
    'Placed': 'Follow up on placement',
    'Rejected': 'Archive',
  }
  return actions[status] ?? 'Review'
}

const buildTrackerItems = async (agencyId: number, applicantIds: string[]): Promise<TrackerItem[]> => {
  const items: TrackerItem[] = []
  for (const id of applicantIds.slice(0, 50)) {
    try {
      const bundle = await getAtsApplication(agencyId, id)
      if (!bundle) continue
      const { application: app, profile, score, interview, documents } = bundle
      const docsComplete = documents.filter((d) => d.required).every((d) => d.status === 'submitted' || d.status === 'verified')
      const needsFollowup = ['New Applicant', 'Documents Submitted'].includes(app.status)
      items.push({
        applicantId: app.id, applicantName: profile?.fullName ?? 'Unknown',
        applicationCode: app.applicationCode, position: profile?.employmentPreference ?? 'General',
        employer: '', currentStatus: app.status, recruitmentStage: app.status,
        matchSuitability: score?.score ?? 0,
        screeningStatus: interview ? interview.interviewResult : 'Not started',
        interviewStatus: interview ? `${interview.interviewResult} (${interview.score}/100)` : 'Pending',
        documentsStatus: docsComplete ? 'Complete' : 'Incomplete',
        followUpRequired: needsFollowup, followUpReason: needsFollowup ? `Status: ${app.status}` : '',
        nextAction: getNextAction(app.status), recruiterNotes: app.aiParseSummary ?? '',
        lastUpdated: app.updatedAt,
        priority: (score?.score ?? 0) >= 75 ? 'high' : (score?.score ?? 0) >= 50 ? 'medium' : 'low',
        aiRecommendation: score?.category ?? 'Not scored',
      })
    } catch { /* skip */ }
  }
  return items
}

// ─── Handle Tracker Actions from Make.com Response ─────────────────────────

const handleTrackerAction = async (
  agencyId: number, userId: string, conversationId: string,
  response: MakeApplicantAssistantResponse, selectedApplicantIds: string[],
): Promise<{ trackerId: string | null; googleDocUrl: string | null }> => {
  const actionType = response.action?.type
  if (!actionType || !response.action) return { trackerId: null, googleDocUrl: null }

  let trackerId: string | null = null
  let googleDocUrl: string | null = null

  if (actionType === 'create_applicant_tracker' || actionType === 'create_google_doc_tracker') {
    const trackerItems = await buildTrackerItems(agencyId, selectedApplicantIds)
    const tracker = await createTracker({
      agencyId,
      name: (response.action.data?.name as string) || `Applicant Tracker - ${new Date().toLocaleDateString()}`,
      description: (response.action.data?.description as string) || 'AI-generated applicant tracker',
      items: trackerItems, createdBy: userId,
    })
    trackerId = tracker.id
    await updateConversationContext(conversationId, { currentTrackerId: trackerId })
    if (response.result?.documentId && response.result?.documentUrl) {
      await saveGoogleDocLink({ agencyId, trackerId: tracker.id, documentId: response.result.documentId, documentUrl: response.result.documentUrl })
      await updateTracker(tracker.id, { googleDocId: response.result.documentId, googleDocUrl: response.result.documentUrl })
      googleDocUrl = response.result.documentUrl
    }
  } else if (actionType === 'update_applicant_tracker' || actionType === 'add_applicant_to_tracker') {
    const conversation = await getConversation(conversationId)
    const existingTrackerId = conversation?.currentTrackerId
    if (existingTrackerId) {
      const trackerItems = await buildTrackerItems(agencyId, selectedApplicantIds)
      await updateTracker(existingTrackerId, { items: trackerItems })
      trackerId = existingTrackerId
      if (response.result?.documentId && response.result?.documentUrl) {
        await saveGoogleDocLink({ agencyId, trackerId: existingTrackerId, documentId: response.result.documentId, documentUrl: response.result.documentUrl })
        await updateTracker(existingTrackerId, { googleDocId: response.result.documentId, googleDocUrl: response.result.documentUrl })
        googleDocUrl = response.result.documentUrl
      }
    }
  } else if (actionType === 'sync_applicants_to_google_doc' || actionType === 'update_google_doc_tracker') {
    const conversation = await getConversation(conversationId)
    const existingTrackerId = conversation?.currentTrackerId
    if (existingTrackerId && response.result?.documentId && response.result?.documentUrl) {
      await saveGoogleDocLink({ agencyId, trackerId: existingTrackerId, documentId: response.result.documentId, documentUrl: response.result.documentUrl })
      await updateTracker(existingTrackerId, { googleDocId: response.result.documentId, googleDocUrl: response.result.documentUrl })
      googleDocUrl = response.result.documentUrl
      trackerId = existingTrackerId
    }
  }

  return { trackerId, googleDocUrl }
}

// ─── Main: Send Message ────────────────────────────────────────────────────

export const sendMessage = async (req: Request, payload: {
  conversationId?: string; message: string
  selectedApplicantIds?: string[]; currentFilters?: Record<string, unknown>; currentSearch?: string
}) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) throw new Error('UNAUTHORIZED')

  const agencyId = admin.agencyId
  const userId = admin.id?.toString() ?? admin.username ?? 'unknown'
  const userName = admin.username ?? admin.email ?? 'Agency Staff'
  const requestId = randomUUID()

  // Idempotency check
  const existingRequestId = req.headers['x-request-id'] as string
  if (existingRequestId && await isRequestAlreadyProcessed(existingRequestId)) {
    return { requestId: existingRequestId, duplicate: true }
  }

  // Get or create conversation
  let conversationId: string = payload.conversationId ?? ''
  let conversation = conversationId ? await getConversation(conversationId) : null
  if (!conversation) {
    conversation = await createConversation({ agencyId, userId, selectedApplicantIds: payload.selectedApplicantIds })
    conversationId = conversation.id
  }
  if (payload.selectedApplicantIds) {
    await updateConversationContext(conversationId, { selectedApplicantIds: payload.selectedApplicantIds })
  }

  // Store user message
  await addMessageToConversation(conversationId, {
    id: randomUUID(), role: 'user', content: payload.message,
    requestId, applicantIds: payload.selectedApplicantIds, timestamp: new Date().toISOString(),
  })

  // Build conversation history
  const updatedConversation = await getConversation(conversationId)
  const conversationHistory = (updatedConversation?.messages ?? []).slice(-12).map((m) => ({ role: m.role, content: m.content }))

  // Build Make.com request and send
  const makeRequest = await buildMakeRequest({
    conversationId, requestId, message: payload.message, agencyId, userId, userName,
    selectedApplicantIds: payload.selectedApplicantIds ?? conversation?.selectedApplicantIds ?? [],
    currentFilters: payload.currentFilters ?? {}, currentSearch: payload.currentSearch ?? '',
    conversationHistory, trackerId: conversation?.currentTrackerId ?? null,
  })

  const makeResult = await sendToMakeWebhook({ scenario: MAKE_SCENARIO, payload: makeRequest as unknown as Record<string, unknown> })

  // Parse Make.com response
  let assistantResponse: MakeApplicantAssistantResponse | null = null
  if (makeResult.ok && makeResult.delivery?.responseBody) {
    try {
      assistantResponse = JSON.parse(makeResult.delivery.responseBody) as MakeApplicantAssistantResponse
    } catch {
      assistantResponse = {
        success: true, requestId, conversationId, type: 'applicant_assistant',
        message: { text: makeResult.delivery.responseBody },
        action: { type: null, status: 'completed', data: {} },
        result: { documentId: null, documentUrl: null, trackerData: null },
        requiresHumanReview: false,
      }
    }
  }

  // Handle tracker actions
  let trackerResult = { trackerId: null as string | null, googleDocUrl: null as string | null }
  if (assistantResponse?.success && assistantResponse.action?.type) {
    trackerResult = await handleTrackerAction(agencyId, userId, conversationId, assistantResponse, payload.selectedApplicantIds ?? conversation?.selectedApplicantIds ?? [])
  }

  // Store assistant message
  const assistantMessage = {
    id: randomUUID(), role: 'assistant' as const,
    content: assistantResponse?.message?.text ?? 'I was unable to process your request. Please try again.',
    requestId, action: (assistantResponse?.action?.type as ApplicantAssistantAction) ?? undefined,
    applicantIds: payload.selectedApplicantIds, timestamp: new Date().toISOString(),
  }
  await addMessageToConversation(conversationId, assistantMessage)

  // Audit
  await addAuditRecord({
    agencyId, userId, requestId, conversationId,
    action: (assistantResponse?.action?.type as ApplicantAssistantAction) ?? 'chat',
    applicantIds: payload.selectedApplicantIds ?? [],
    result: makeResult.ok ? 'success' : 'failure',
    makeExecutionId: makeResult.delivery?.id?.toString() ?? null,
    googleDocId: trackerResult.trackerId ? (await getGoogleDocLinkForTracker(trackerResult.trackerId))?.documentId ?? null : null,
    errorMessage: makeResult.ok ? null : makeResult.delivery?.error ?? 'Unknown error',
    humanApprovalRequired: assistantResponse?.requiresHumanReview ?? false,
    humanApprovalGiven: null,
  })

  if (existingRequestId) await markRequestProcessed(existingRequestId)
  await markRequestProcessed(requestId)

  return {
    requestId, conversationId, duplicate: false,
    message: assistantMessage.content,
    action: assistantResponse?.action ?? null,
    result: { trackerId: trackerResult.trackerId, googleDocUrl: trackerResult.googleDocUrl, documentId: assistantResponse?.result?.documentId ?? null },
    requiresHumanReview: assistantResponse?.requiresHumanReview ?? false,
    makeSuccess: makeResult.ok,
  }
}

// ─── Tracker Operations ────────────────────────────────────────────────────

export const getTrackerStatus = async (req: Request, trackerId?: string) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) throw new Error('UNAUTHORIZED')
  if (trackerId) {
    const tracker = await getTracker(trackerId)
    if (!tracker || tracker.agencyId !== admin.agencyId) throw new Error('TRACKER_NOT_FOUND')
    const docLink = await getGoogleDocLinkForTracker(trackerId)
    return { tracker, googleDocUrl: docLink?.documentUrl ?? null }
  }
  const tracker = await getActiveTrackerForAgency(admin.agencyId)
  if (!tracker) return { tracker: null, googleDocUrl: null }
  const docLink = await getGoogleDocLinkForTracker(tracker.id)
  return { tracker, googleDocUrl: docLink?.documentUrl ?? null }
}

export const createTrackerFromApplicants = async (req: Request, payload: {
  applicantIds?: string[]; name?: string; filters?: Record<string, unknown>
}) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) throw new Error('UNAUTHORIZED')
  let applicantIds = payload.applicantIds ?? []
  if (applicantIds.length === 0 && payload.filters) {
    const result = await listAtsApplications(admin.agencyId, { filters: payload.filters, pageSize: 100 })
    applicantIds = result.data.map((a) => a.id)
  }
  const items = await buildTrackerItems(admin.agencyId, applicantIds)
  return createTracker({
    agencyId: admin.agencyId,
    name: payload.name ?? `Applicant Tracker - ${new Date().toLocaleDateString()}`,
    description: `Tracker for ${items.length} applicants`,
    items, createdBy: admin.username ?? admin.email ?? 'Agency Staff',
  })
}
