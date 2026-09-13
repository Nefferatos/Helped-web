export type ApplicantAssistantAction =
  | 'chat'
  | 'create_applicant_tracker'
  | 'update_applicant_tracker'
  | 'add_applicant_to_tracker'
  | 'remove_applicant_from_tracker'
  | 'sync_applicants_to_google_doc'
  | 'create_google_doc_tracker'
  | 'update_google_doc_tracker'
  | 'get_tracker_status'
  | 'find_applicants_needing_followup'
  | 'analyze_applicant'
  | 'compare_applicants'
  | 'prepare_screening_list'
  | 'prepare_followup_list'
  | 'recommend_applicants'

export type TrackerItemStatus =
  | 'new'
  | 'screening'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'background_check'
  | 'approved'
  | 'placed'
  | 'rejected'
  | 'followup_needed'
  | 'documents_pending'
  | 'waiting_employer_response'

export type TrackerItemPriority = 'high' | 'medium' | 'low'

export interface TrackerItem {
  applicantId: string
  applicantName: string
  applicationCode: string
  position: string
  employer: string
  currentStatus: string
  recruitmentStage: string
  matchSuitability: number
  screeningStatus: string
  interviewStatus: string
  documentsStatus: string
  followUpRequired: boolean
  followUpReason: string
  nextAction: string
  recruiterNotes: string
  lastUpdated: string
  priority: TrackerItemPriority
  aiRecommendation: string
}

export interface ApplicantTrackerRecord {
  id: string
  agencyId: number
  name: string
  description: string
  items: TrackerItem[]
  googleDocId: string | null
  googleDocUrl: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ApplicantAssistantConversation {
  id: string
  agencyId: number
  userId: string
  messages: ApplicantAssistantMessage[]
  selectedApplicantIds: string[]
  currentTrackerId: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicantAssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  requestId: string
  action?: ApplicantAssistantAction
  applicantIds?: string[]
  timestamp: string
}

export interface ApplicantAssistantAuditRecord {
  id: string
  agencyId: number
  userId: string
  requestId: string
  conversationId: string
  action: ApplicantAssistantAction
  applicantIds: string[]
  timestamp: string
  result: 'success' | 'failure' | 'pending'
  makeExecutionId: string | null
  googleDocId: string | null
  errorMessage: string | null
  humanApprovalRequired: boolean
  humanApprovalGiven: boolean | null
}

export interface GoogleDocLinkRecord {
  id: string
  agencyId: number
  trackerId: string
  documentId: string
  documentUrl: string
  createdAt: string
  updatedAt: string
}

export interface MakeApplicantAssistantRequest {
  conversationId: string
  requestId: string
  message: string
  type: 'applicant_assistant'
  context: {
    user: {
      id: string
      name: string
      email: string
    }
    agency: {
      id: number
      name: string
    }
    selectedApplicant: Record<string, unknown> | null
    selectedApplicants: Array<Record<string, unknown>>
    currentFilters: Record<string, unknown>
    currentSearch: string
    applicantSummary: {
      total: number
      byStage: Record<string, number>
      byNationality: Record<string, number>
      averageScore: number
      needingFollowup: number
      recentlyAdded: number
    }
  }
  conversationHistory: Array<{ role: string; content: string }>
  trackerContext: {
    existingTracker: ApplicantTrackerRecord | null
    googleDocId: string | null
  }
}

export interface MakeApplicantAssistantResponse {
  success: boolean
  requestId: string
  conversationId: string
  type: 'applicant_assistant'
  message: {
    text: string
  }
  action: {
    type: ApplicantAssistantAction | null
    status: 'completed' | 'pending' | 'needs_confirmation' | 'failed'
    data: Record<string, unknown>
  }
  result: {
    documentId: string | null
    documentUrl: string | null
    trackerData: Record<string, unknown> | null
  }
  requiresHumanReview: boolean
}