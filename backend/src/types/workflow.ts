export type LeadSource = 'facebook' | 'website' | 'scraped'
export type LeadClassification = 'HIGH' | 'MEDIUM' | 'LOW'
export type InquiryIntent = 'hiring' | 'inquiry' | 'complaint'
export type WorkflowAssignment =
  | 'lead_nurture'
  | 'maid_matching'
  | 'support_escalation'
  | 'general_inquiry'
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'internal'
export type AutomationStatus = 'success' | 'warning' | 'failed'

export interface BudgetRange {
  min: number | null
  max: number | null
  currency: string
  text: string
}

export interface LeadEnrichment {
  serviceType: string
  budget: BudgetRange
  urgency: string
  location: string
  summary: string
}

export interface LeadQualification {
  score: number
  classification: LeadClassification
  reasons: string[]
}

export interface StructuredLeadInput {
  source: LeadSource
  name: string
  contact: string
  message: string
  serviceType: string
  budget: BudgetRange
  urgency: string
  location: string
  score: number
  classification: LeadClassification
  aiSummary: string
  qualificationReasons: string[]
}

export interface WorkflowLeadRecord extends StructuredLeadInput {
  id: number
  status: 'new' | 'qualified' | 'nurturing' | 'matched' | 'closed'
  createdAt: string
  updatedAt: string
}

export interface WorkflowInquiryRecord {
  id: number
  name: string
  contact: string
  message: string
  intent: InquiryIntent
  workflow: WorkflowAssignment
  reply: string
  aiUsed: boolean
  createdAt: string
}

export interface WorkflowMatchRecord {
  id: number
  leadId: number | null
  inquiryId: number | null
  employerId: number | null
  maidId: number
  maidReferenceCode: string
  maidName: string
  score: number
  reasons: string[]
  createdAt: string
}

export interface WorkflowScheduleRecord {
  id: number
  maidId: number
  employerId: number
  datetime: string
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
}

export interface WorkflowContractRecord {
  id: number
  maidId: number
  employerId: number
  contractText: string
  summary: string
  status: 'draft' | 'active' | 'cancelled'
  createdAt: string
}

export interface WorkflowNotificationRecord {
  id: number
  channel: NotificationChannel
  recipient: string
  message: string
  referenceType: string
  referenceId: string
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
}

export interface WorkflowAutomationLogRecord {
  id: number
  workflow: string
  step: string
  status: AutomationStatus
  message: string
  payload?: Record<string, unknown>
  createdAt: string
}

export interface WorkflowMakeDeliveryRecord {
  id: number
  scenario: string
  url: string
  payload: Record<string, unknown>
  success: boolean
  statusCode: number | null
  durationMs: number
  responseBody: string
  error: string
  createdAt: string
}

export interface InquiryAutomationResult {
  intent: InquiryIntent
  workflow: WorkflowAssignment
  reply: string
}

export interface MatchCriteria {
  leadId?: number
  inquiryId?: number
  employerId?: number
  message?: string
  serviceType?: string
  location?: string
  budget?: BudgetRange
  salary?: BudgetRange
  availability?: string
}

export interface MatchCandidate {
  maidId: number
  maidReferenceCode: string
  maidName: string
  score: number
  reasons: string[]
}
