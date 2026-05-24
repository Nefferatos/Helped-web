import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { getMaidByReferenceCodeStore, type MaidRecord } from './store'

export type WhatsAppConversationStatus = 'active' | 'needs_attention' | 'closed'
export type WhatsAppMessageDirection = 'incoming' | 'outgoing'
export type WhatsAppMessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type WhatsAppAttachmentKind = 'image' | 'video' | 'document' | 'audio' | 'voice'
export type WhatsAppTemplateCategory =
  | 'application'
  | 'documents'
  | 'interview'
  | 'background'
  | 'approval'
  | 'matching'
  | 'deployment'
  | 'broadcast'
  | 'general'

export interface WhatsAppAttachmentRecord {
  id: string
  agencyId: number
  conversationId: string
  messageId: string
  candidateReferenceCode: string
  fileName: string
  mimeType: string
  size: number
  kind: WhatsAppAttachmentKind
  storagePath: string
  publicUrl: string
  uploadedAt: string
}

export interface WhatsAppTemplateRecord {
  id: string
  agencyId: number
  key: string
  name: string
  category: WhatsAppTemplateCategory
  language: string
  body: string
  variables: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface WhatsAppEventRecord {
  id: string
  agencyId: number
  conversationId: string
  messageId?: string
  candidateReferenceCode: string
  type:
    | 'message_sent'
    | 'message_delivered'
    | 'message_read'
    | 'message_failed'
    | 'inbound_message'
    | 'workflow_triggered'
    | 'document_received'
    | 'interview_confirmed'
    | 'interview_rescheduled'
    | 'interview_cancelled'
    | 'ai_escalated'
    | 'broadcast_sent'
  detail: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface WhatsAppMessageLogRecord {
  id: string
  agencyId: number
  conversationId: string
  messageId: string
  provider: 'mock' | 'meta-cloud'
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown>
  status: WhatsAppMessageStatus
  createdAt: string
}

export interface WhatsAppMessageRecord {
  id: string
  agencyId: number
  conversationId: string
  candidateReferenceCode: string
  candidateName: string
  direction: WhatsAppMessageDirection
  status: WhatsAppMessageStatus
  type: 'text' | 'template' | 'image' | 'video' | 'document' | 'audio' | 'voice' | 'system'
  senderName: string
  senderRole: 'recruiter' | 'applicant' | 'ai' | 'system'
  text: string
  templateKey?: string
  attachmentIds: string[]
  automated: boolean
  readAt?: string
  failedReason?: string
  externalMessageId?: string
  createdAt: string
}

export interface WhatsAppBroadcastRecord {
  id: string
  agencyId: number
  name: string
  filterSummary: string
  recipientCount: number
  messageIds: string[]
  createdBy: string
  createdAt: string
}

export interface WhatsAppConversationRecord {
  id: string
  agencyId: number
  candidateReferenceCode: string
  candidateId?: number
  candidateName: string
  phoneNumber: string
  currentStage: string
  nextStep: string
  tags: string[]
  unreadRecruiterCount: number
  unreadApplicantCount: number
  lastMessageAt: string
  lastMessagePreview: string
  status: WhatsAppConversationStatus
  aiEnabled: boolean
  assignedRecruiter?: string
  interviewSchedule?: {
    date: string
    time: string
    status: 'scheduled' | 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed'
  }
  documentChecklist: Array<{
    key: string
    label: string
    completed: boolean
    lastSubmittedAt?: string
  }>
  createdAt: string
  updatedAt: string
}

interface WhatsAppData {
  conversations: WhatsAppConversationRecord[]
  messages: WhatsAppMessageRecord[]
  templates: WhatsAppTemplateRecord[]
  attachments: WhatsAppAttachmentRecord[]
  events: WhatsAppEventRecord[]
  broadcasts: WhatsAppBroadcastRecord[]
  messageLogs: WhatsAppMessageLogRecord[]
}

const now = () => new Date().toISOString()
const dataDir = path.resolve(__dirname, '../data')
const uploadsRoot = path.resolve(__dirname, '../data/uploads/whatsapp')
const dataFile = path.join(dataDir, 'whatsapp-data.json')
const dataUrlPattern = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i

const sanitizePathSegment = (value: string, fallback: string) => {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return sanitized || fallback
}

const ensureDir = async (dir: string) => {
  await mkdir(dir, { recursive: true })
  return dir
}

const ensureUploadDir = async (...segments: string[]) =>
  ensureDir(path.join(uploadsRoot, ...segments))

const normalizePhoneNumber = (value: string) => value.replace(/[^\d+]/g, '').trim()

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const stageToTags = (stage: string) => {
  const normalized = stage.trim().toLowerCase()
  if (normalized.includes('document')) return ['Documents Pending']
  if (normalized.includes('interview scheduled')) return ['Interview Scheduled']
  if (normalized.includes('interview completed')) return ['Interview Completed']
  if (normalized.includes('background')) return ['Background Check']
  if (normalized.includes('approved')) return ['Approved', 'Ready For Matching']
  if (normalized.includes('match')) return ['Matched']
  if (normalized.includes('placed') || normalized.includes('deployment')) return ['Placed']
  if (normalized.includes('reject')) return ['Rejected']
  if (normalized.includes('application')) return ['New Applicant']
  return ['New Applicant']
}

const defaultDocumentChecklist = () => [
  { key: 'passport', label: 'Passport', completed: false },
  { key: 'resume', label: 'Resume', completed: false },
  { key: 'certificate', label: 'Training Certificates', completed: false },
  { key: 'medical', label: 'Medical Reports', completed: false },
]

const defaultTemplates = (agencyId: number): WhatsAppTemplateRecord[] => {
  const createdAt = now()
  const createTemplate = (
    key: string,
    name: string,
    category: WhatsAppTemplateCategory,
    body: string,
    variables: string[] = []
  ): WhatsAppTemplateRecord => ({
    id: randomUUID(),
    agencyId,
    key,
    name,
    category,
    language: 'en',
    body,
    variables,
    active: true,
    createdAt,
    updatedAt: createdAt,
  })

  return [
    createTemplate(
      'application_received',
      'Application Received',
      'application',
      'Thank you for applying with our agency. We have received your application and will review your profile shortly.'
    ),
    createTemplate(
      'missing_documents',
      'Missing Documents',
      'documents',
      'We noticed some required documents are missing. Please upload your passport and training certificates using the provided link.'
    ),
    createTemplate(
      'interview_scheduling',
      'Interview Scheduling',
      'interview',
      'Your interview has been scheduled for {{date}} at {{time}}. Please confirm your availability.',
      ['date', 'time']
    ),
    createTemplate(
      'interview_reminder_24h',
      'Interview Reminder 24h',
      'interview',
      'Reminder: your interview is in 24 hours on {{date}} at {{time}}.',
      ['date', 'time']
    ),
    createTemplate(
      'interview_reminder_1h',
      'Interview Reminder 1h',
      'interview',
      'Reminder: your interview starts in 1 hour at {{time}}.',
      ['time']
    ),
    createTemplate(
      'background_check_update',
      'Background Check Update',
      'background',
      'Your application is currently undergoing verification. We will update you once the process is complete.'
    ),
    createTemplate(
      'approval_notice',
      'Approval Notice',
      'approval',
      'Congratulations! Your application has been approved and you are now available for employer matching.'
    ),
    createTemplate(
      'rejection_notice',
      'Rejection Notice',
      'approval',
      'Thank you for your application. Unfortunately, we will not proceed further at this time.'
    ),
    createTemplate(
      'client_match_notification',
      'Client Match Notification',
      'matching',
      'We found a potential employer match for your profile. Please review the details and confirm your interest.'
    ),
    createTemplate(
      'deployment_preparation',
      'Deployment Preparation',
      'deployment',
      'Your deployment process has started. Our team will guide you through the remaining steps.'
    ),
    createTemplate(
      'job_offer',
      'Job Offer',
      'matching',
      'We are pleased to share a job offer with you. Please review the attached details and reply if you would like to proceed.'
    ),
  ]
}

const defaultData = (): WhatsAppData => ({
  conversations: [],
  messages: [],
  templates: defaultTemplates(1),
  attachments: [],
  events: [],
  broadcasts: [],
  messageLogs: [],
})

const readData = async () => {
  try {
    const raw = await readFile(dataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WhatsAppData>
    return {
      ...defaultData(),
      ...parsed,
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? [],
      templates: parsed.templates?.length ? parsed.templates : defaultTemplates(1),
      attachments: parsed.attachments ?? [],
      events: parsed.events ?? [],
      broadcasts: parsed.broadcasts ?? [],
      messageLogs: parsed.messageLogs ?? [],
    }
  } catch {
    const seed = defaultData()
    await writeData(seed)
    return seed
  }
}

const writeData = async (data: WhatsAppData) => {
  await ensureDir(dataDir)
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8')
}

const renderTemplate = (
  body: string,
  variables: Record<string, string | undefined> = {}
) =>
  body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    String(variables[key] ?? '').trim()
  )

const candidatePhoneFromMaid = (maid: MaidRecord) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>
  const directPhone =
    typeof agencyContact.whatsappNumber === 'string'
      ? agencyContact.whatsappNumber
      : typeof agencyContact.phone === 'string'
      ? agencyContact.phone
      : ''
  return normalizePhoneNumber(directPhone)
}

const candidateStageFromMaid = (maid: MaidRecord) => {
  const stage = String(maid.status || 'Application Received').trim()
  return stage || 'Application Received'
}

const nextStepFromStage = (stage: string, interviewSchedule?: WhatsAppConversationRecord['interviewSchedule']) => {
  const normalized = stage.toLowerCase()
  if (normalized.includes('interview') && interviewSchedule?.date) {
    return `Attend interview on ${interviewSchedule.date}${interviewSchedule.time ? ` at ${interviewSchedule.time}` : ''}`
  }
  if (normalized.includes('document')) return 'Upload the requested documents'
  if (normalized.includes('background')) return 'Wait for verification completion'
  if (normalized.includes('approved')) return 'Await employer matching updates'
  if (normalized.includes('deployment')) return 'Complete deployment preparation tasks'
  if (normalized.includes('rejected')) return 'Contact the agency if you need clarification'
  return 'Await the next recruitment update from the agency'
}

const persistAttachment = async (input: {
  agencyId: number
  candidateReferenceCode: string
  conversationId: string
  messageId: string
  fileName: string
  mimeType: string
  dataBase64: string
  kind: WhatsAppAttachmentKind
}) => {
  const safeReference = sanitizePathSegment(input.candidateReferenceCode, 'candidate')
  const safeName = sanitizePathSegment(input.fileName, 'attachment')
  const dir = await ensureUploadDir(`agency-${input.agencyId}`, safeReference)
  const filePath = path.join(dir, `${randomUUID()}-${safeName}`)
  await writeFile(filePath, Buffer.from(input.dataBase64, 'base64'))
  const size = Buffer.byteLength(input.dataBase64, 'base64')
  const storagePath = path.relative(path.resolve(__dirname, '../data/uploads'), filePath).replace(/\\/g, '/')
  return {
    id: randomUUID(),
    agencyId: input.agencyId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    candidateReferenceCode: input.candidateReferenceCode,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size,
    kind: input.kind,
    storagePath,
    publicUrl: `/uploads/${storagePath}`,
    uploadedAt: now(),
  } satisfies WhatsAppAttachmentRecord
}

const inferChecklistKey = (attachment: {
  fileName: string
  mimeType: string
}) => {
  const text = `${attachment.fileName} ${attachment.mimeType}`.toLowerCase()
  if (text.includes('passport')) return 'passport'
  if (text.includes('resume') || text.includes('cv')) return 'resume'
  if (text.includes('cert')) return 'certificate'
  if (text.includes('medical')) return 'medical'
  return null
}

const findConversation = (
  data: WhatsAppData,
  agencyId: number,
  candidateReferenceCode: string
) =>
  data.conversations.find(
    (conversation) =>
      conversation.agencyId === agencyId &&
      conversation.candidateReferenceCode === candidateReferenceCode
  ) ?? null

const createEvent = (
  agencyId: number,
  conversationId: string,
  candidateReferenceCode: string,
  type: WhatsAppEventRecord['type'],
  detail: string,
  metadata: Record<string, unknown> = {},
  messageId?: string
): WhatsAppEventRecord => ({
  id: randomUUID(),
  agencyId,
  conversationId,
  messageId,
  candidateReferenceCode,
  type,
  detail,
  metadata,
  createdAt: now(),
})

const createLog = (
  agencyId: number,
  conversationId: string,
  messageId: string,
  status: WhatsAppMessageStatus,
  requestPayload: Record<string, unknown>,
  responsePayload: Record<string, unknown>
): WhatsAppMessageLogRecord => ({
  id: randomUUID(),
  agencyId,
  conversationId,
  messageId,
  provider: process.env.WHATSAPP_PROVIDER === 'meta-cloud' ? 'meta-cloud' : 'mock',
  status,
  requestPayload,
  responsePayload,
  createdAt: now(),
})

const ensureTemplatesForAgency = (data: WhatsAppData, agencyId: number) => {
  if (data.templates.some((template) => template.agencyId === agencyId)) {
    return
  }
  data.templates.push(...defaultTemplates(agencyId))
}

export const initializeWhatsAppStore = async () => {
  await readData()
}

export const getWhatsAppConversationBundle = async (
  agencyId: number,
  candidateReferenceCode: string
) => {
  const maid = await getMaidByReferenceCodeStore(candidateReferenceCode, agencyId)
  if (!maid) throw new Error('CANDIDATE_NOT_FOUND')

  const data = await readData()
  ensureTemplatesForAgency(data, agencyId)
  let conversation = findConversation(data, agencyId, candidateReferenceCode)

  if (!conversation) {
    conversation = {
      id: randomUUID(),
      agencyId,
      candidateReferenceCode,
      candidateId: maid.id,
      candidateName: maid.fullName,
      phoneNumber: candidatePhoneFromMaid(maid),
      currentStage: candidateStageFromMaid(maid),
      nextStep: nextStepFromStage(candidateStageFromMaid(maid)),
      tags: stageToTags(candidateStageFromMaid(maid)),
      unreadRecruiterCount: 0,
      unreadApplicantCount: 0,
      lastMessageAt: maid.updatedAt,
      lastMessagePreview: '',
      status: 'active',
      aiEnabled: true,
      documentChecklist: defaultDocumentChecklist(),
      createdAt: now(),
      updatedAt: now(),
    }
    data.conversations.unshift(conversation)
    await writeData(data)
  } else {
    conversation.currentStage = candidateStageFromMaid(maid)
    conversation.tags = uniqueStrings(stageToTags(conversation.currentStage).concat(conversation.tags))
    conversation.nextStep = nextStepFromStage(conversation.currentStage, conversation.interviewSchedule)
    conversation.phoneNumber = conversation.phoneNumber || candidatePhoneFromMaid(maid)
    conversation.candidateName = maid.fullName
    conversation.candidateId = maid.id
    conversation.updatedAt = now()
    await writeData(data)
  }

  const messages = data.messages
    .filter((message) => message.conversationId === conversation.id)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  const attachments = data.attachments.filter((attachment) => attachment.conversationId === conversation.id)
  const templates = data.templates
    .filter((template) => template.agencyId === agencyId && template.active)
    .sort((left, right) => left.name.localeCompare(right.name))
  const events = data.events
    .filter((event) => event.conversationId === conversation.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return {
    conversation,
    candidate: maid,
    messages: messages.map((message) => ({
      ...message,
      attachments: attachments.filter((attachment) => message.attachmentIds.includes(attachment.id)),
    })),
    templates,
    events,
  }
}

export const sendWhatsAppMessage = async (input: {
  agencyId: number
  candidateReferenceCode: string
  senderName: string
  text?: string
  templateKey?: string
  templateVariables?: Record<string, string | undefined>
  attachments?: Array<{
    fileName: string
    mimeType: string
    dataBase64: string
    kind: WhatsAppAttachmentKind
  }>
  automated?: boolean
}) => {
  const bundle = await getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
  const data = await readData()
  const conversation = findConversation(data, input.agencyId, input.candidateReferenceCode)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')

  const template = input.templateKey
    ? data.templates.find(
        (item) =>
          item.agencyId === input.agencyId &&
          item.key === input.templateKey &&
          item.active
      ) ?? null
    : null

  const text =
    template != null
      ? renderTemplate(template.body, input.templateVariables)
      : String(input.text ?? '').trim()

  if (!text && (!input.attachments || input.attachments.length === 0)) {
    throw new Error('MESSAGE_REQUIRED')
  }

  const messageId = randomUUID()
  const attachmentRecords = await Promise.all(
    (input.attachments ?? []).map((attachment) =>
      persistAttachment({
        agencyId: input.agencyId,
        candidateReferenceCode: input.candidateReferenceCode,
        conversationId: conversation.id,
        messageId,
        ...attachment,
      })
    )
  )

  const status: WhatsAppMessageStatus =
    process.env.WHATSAPP_PROVIDER === 'meta-cloud' ? 'sent' : 'delivered'

  const primaryType =
    attachmentRecords[0]?.kind === 'voice'
      ? 'voice'
      : attachmentRecords[0]?.kind === 'audio'
      ? 'audio'
      : attachmentRecords[0]?.kind === 'document'
      ? 'document'
      : attachmentRecords[0]?.kind === 'image'
      ? 'image'
      : attachmentRecords[0]?.kind === 'video'
      ? 'video'
      : template
      ? 'template'
      : 'text'

  const message: WhatsAppMessageRecord = {
    id: messageId,
    agencyId: input.agencyId,
    conversationId: conversation.id,
    candidateReferenceCode: input.candidateReferenceCode,
    candidateName: bundle.candidate.fullName,
    direction: 'outgoing',
    status,
    type: primaryType,
    senderName: input.senderName,
    senderRole: input.automated ? 'ai' : 'recruiter',
    text,
    templateKey: template?.key,
    attachmentIds: attachmentRecords.map((attachment) => attachment.id),
    automated: Boolean(input.automated),
    createdAt: now(),
  }

  conversation.unreadApplicantCount += 1
  conversation.lastMessageAt = message.createdAt
  conversation.lastMessagePreview = text || `${attachmentRecords.length} attachment(s)`
  conversation.status = 'active'
  conversation.updatedAt = now()

  data.attachments.unshift(...attachmentRecords)
  data.messages.push(message)
  data.events.unshift(
    createEvent(
      input.agencyId,
      conversation.id,
      input.candidateReferenceCode,
      'message_sent',
      template ? `Template sent: ${template.name}` : 'Recruiter message sent',
      {
        automated: Boolean(input.automated),
        status,
      },
      message.id
    )
  )
  if (status === 'delivered') {
    data.events.unshift(
      createEvent(
        input.agencyId,
        conversation.id,
        input.candidateReferenceCode,
        'message_delivered',
        'Message delivered to applicant',
        {},
        message.id
      )
    )
  }
  data.messageLogs.unshift(
    createLog(
      input.agencyId,
      conversation.id,
      message.id,
      status,
      {
        text,
        templateKey: template?.key,
        attachmentCount: attachmentRecords.length,
      },
      {
        mode: process.env.WHATSAPP_PROVIDER === 'meta-cloud' ? 'meta-cloud' : 'mock',
      }
    )
  )

  await writeData(data)
  return getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
}

const markLatestOutboundAsRead = (data: WhatsAppData, conversationId: string) => {
  data.messages
    .filter(
      (message) =>
        message.conversationId === conversationId &&
        message.direction === 'outgoing' &&
        message.status !== 'read'
    )
    .forEach((message) => {
      message.status = 'read'
      message.readAt = now()
    })
}

const buildAiReply = (conversation: WhatsAppConversationRecord, candidate: MaidRecord, text: string) => {
  const normalized = text.trim().toLowerCase()
  if (/^(status|check status|application status)$/.test(normalized)) {
    return {
      text: `Current Status: ${conversation.currentStage}\nNext Step: ${conversation.nextStep}`,
      escalate: false,
    }
  }
  if (normalized.includes('document')) {
    const outstanding = conversation.documentChecklist
      .filter((item) => !item.completed)
      .map((item) => item.label)
    return {
      text:
        outstanding.length > 0
          ? `You still need to submit: ${outstanding.join(', ')}. You can upload them directly here on WhatsApp.`
          : 'Your required documents are complete. We will let you know if anything else is needed.',
      escalate: false,
    }
  }
  if (normalized.includes('interview')) {
    if (conversation.interviewSchedule?.date) {
      return {
        text: `Your interview is scheduled for ${conversation.interviewSchedule.date} at ${conversation.interviewSchedule.time}. Reply CONFIRM, RESCHEDULE, or CANCEL.`,
        escalate: false,
      }
    }
    return {
      text: 'Your interview schedule is still being arranged. Our team will update you shortly.',
      escalate: false,
    }
  }
  if (normalized.includes('requirement') || normalized.includes('what documents do i need')) {
    return {
      text:
        'You need a passport, resume, certificates, references, and any previous employment records.',
      escalate: false,
    }
  }
  if (normalized.includes('human') || normalized.includes('agent') || normalized.includes('recruiter')) {
    return {
      text: 'I am escalating this conversation to a recruiter. Our team will reply as soon as possible.',
      escalate: true,
    }
  }
  const candidateName = candidate.fullName.split(' ')[0] || 'there'
  return {
    text: `Hi ${candidateName}, your current application stage is ${conversation.currentStage}. If you need documents, interview timing, or status updates, I can help right away.`,
    escalate: false,
  }
}

export const receiveWhatsAppInbound = async (input: {
  agencyId: number
  candidateReferenceCode: string
  applicantName?: string
  text?: string
  attachments?: Array<{
    fileName: string
    mimeType: string
    dataBase64: string
    kind: WhatsAppAttachmentKind
  }>
  enableAiReply?: boolean
}) => {
  const bundle = await getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
  const data = await readData()
  const conversation = findConversation(data, input.agencyId, input.candidateReferenceCode)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')

  const text = String(input.text ?? '').trim()
  const messageId = randomUUID()
  const attachmentRecords = await Promise.all(
    (input.attachments ?? []).map((attachment) =>
      persistAttachment({
        agencyId: input.agencyId,
        candidateReferenceCode: input.candidateReferenceCode,
        conversationId: conversation.id,
        messageId,
        ...attachment,
      })
    )
  )

  if (!text && attachmentRecords.length === 0) {
    throw new Error('MESSAGE_REQUIRED')
  }

  markLatestOutboundAsRead(data, conversation.id)

  const message: WhatsAppMessageRecord = {
    id: messageId,
    agencyId: input.agencyId,
    conversationId: conversation.id,
    candidateReferenceCode: input.candidateReferenceCode,
    candidateName: bundle.candidate.fullName,
    direction: 'incoming',
    status: 'read',
    type: attachmentRecords[0]?.kind === 'voice' ? 'voice' : attachmentRecords[0]?.kind ?? 'text',
    senderName: input.applicantName?.trim() || bundle.candidate.fullName,
    senderRole: 'applicant',
    text,
    attachmentIds: attachmentRecords.map((attachment) => attachment.id),
    automated: false,
    readAt: now(),
    createdAt: now(),
  }

  data.attachments.unshift(...attachmentRecords)
  data.messages.push(message)
  data.events.unshift(
    createEvent(
      input.agencyId,
      conversation.id,
      input.candidateReferenceCode,
      'inbound_message',
      'Inbound applicant reply received',
      {
        attachmentCount: attachmentRecords.length,
      },
      message.id
    )
  )

  attachmentRecords.forEach((attachment) => {
    const checklistKey = inferChecklistKey(attachment)
    if (!checklistKey) return
    const checklistItem = conversation.documentChecklist.find((item) => item.key === checklistKey)
    if (!checklistItem) return
    checklistItem.completed = true
    checklistItem.lastSubmittedAt = attachment.uploadedAt
    data.events.unshift(
      createEvent(
        input.agencyId,
        conversation.id,
        input.candidateReferenceCode,
        'document_received',
        `${checklistItem.label} received`,
        {
          attachmentId: attachment.id,
          checklistKey,
        },
        message.id
      )
    )
  })

  const normalizedText = text.toLowerCase()
  if (normalizedText === 'confirm' && conversation.interviewSchedule) {
    conversation.interviewSchedule.status = 'confirmed'
    data.events.unshift(
      createEvent(
        input.agencyId,
        conversation.id,
        input.candidateReferenceCode,
        'interview_confirmed',
        'Applicant confirmed interview attendance',
        {},
        message.id
      )
    )
  } else if (normalizedText === 'reschedule' && conversation.interviewSchedule) {
    conversation.interviewSchedule.status = 'reschedule_requested'
    data.events.unshift(
      createEvent(
        input.agencyId,
        conversation.id,
        input.candidateReferenceCode,
        'interview_rescheduled',
        'Applicant requested interview reschedule',
        {},
        message.id
      )
    )
  } else if (normalizedText === 'cancel' && conversation.interviewSchedule) {
    conversation.interviewSchedule.status = 'cancelled'
    data.events.unshift(
      createEvent(
        input.agencyId,
        conversation.id,
        input.candidateReferenceCode,
        'interview_cancelled',
        'Applicant cancelled interview',
        {},
        message.id
      )
    )
  }

  conversation.unreadRecruiterCount += 1
  conversation.lastMessageAt = message.createdAt
  conversation.lastMessagePreview = text || `${attachmentRecords.length} file(s) received`
  conversation.status = 'needs_attention'
  conversation.updatedAt = now()

  if (conversation.aiEnabled && input.enableAiReply !== false) {
    const ai = buildAiReply(conversation, bundle.candidate, text)
    if (ai.escalate) {
      data.events.unshift(
        createEvent(
          input.agencyId,
          conversation.id,
          input.candidateReferenceCode,
          'ai_escalated',
          'AI assistant escalated the conversation to a human recruiter'
        )
      )
    }
    await writeData(data)
    return sendWhatsAppMessage({
      agencyId: input.agencyId,
      candidateReferenceCode: input.candidateReferenceCode,
      senderName: 'Recruitment Assistant',
      text: ai.text,
      automated: true,
    })
  }

  await writeData(data)
  return getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
}

export const updateWhatsAppConversationStage = async (input: {
  agencyId: number
  candidateReferenceCode: string
  stage: string
  nextStep?: string
  interviewSchedule?: WhatsAppConversationRecord['interviewSchedule']
  sendWorkflowTemplate?: boolean
  actorName: string
}): Promise<Awaited<ReturnType<typeof getWhatsAppConversationBundle>>> => {
  const data = await readData()
  const conversation = findConversation(data, input.agencyId, input.candidateReferenceCode)
  if (!conversation) {
    await getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
    return updateWhatsAppConversationStage(input)
  }

  conversation.currentStage = input.stage.trim()
  conversation.nextStep =
    input.nextStep?.trim() || nextStepFromStage(conversation.currentStage, input.interviewSchedule)
  conversation.tags = uniqueStrings(stageToTags(conversation.currentStage))
  if (input.interviewSchedule) {
    conversation.interviewSchedule = input.interviewSchedule
  }
  conversation.updatedAt = now()

  data.events.unshift(
    createEvent(
      input.agencyId,
      conversation.id,
      input.candidateReferenceCode,
      'workflow_triggered',
      `Recruitment stage updated to ${conversation.currentStage}`,
      {
        actorName: input.actorName,
      }
    )
  )
  await writeData(data)

  if (input.sendWorkflowTemplate) {
    const workflowTemplateKey =
      conversation.currentStage.toLowerCase().includes('interview')
        ? 'interview_scheduling'
        : conversation.currentStage.toLowerCase().includes('document')
        ? 'missing_documents'
        : conversation.currentStage.toLowerCase().includes('background')
        ? 'background_check_update'
        : conversation.currentStage.toLowerCase().includes('approved')
        ? 'approval_notice'
        : conversation.currentStage.toLowerCase().includes('rejected')
        ? 'rejection_notice'
        : conversation.currentStage.toLowerCase().includes('match')
        ? 'client_match_notification'
        : conversation.currentStage.toLowerCase().includes('deployment')
        ? 'deployment_preparation'
        : 'application_received'

    return sendWhatsAppMessage({
      agencyId: input.agencyId,
      candidateReferenceCode: input.candidateReferenceCode,
      senderName: input.actorName,
      templateKey: workflowTemplateKey,
      templateVariables: {
        date: input.interviewSchedule?.date,
        time: input.interviewSchedule?.time,
      },
      automated: true,
    })
  }

  return getWhatsAppConversationBundle(input.agencyId, input.candidateReferenceCode)
}

export const getWhatsAppDashboardMetrics = async (agencyId: number) => {
  const data = await readData()
  const conversations = data.conversations.filter((item) => item.agencyId === agencyId)
  const messages = data.messages.filter((item) => item.agencyId === agencyId)
  const outgoing = messages.filter((item) => item.direction === 'outgoing')
  const delivered = outgoing.filter((item) => item.status === 'delivered' || item.status === 'read')
  const read = outgoing.filter((item) => item.status === 'read')
  const responseWindows = conversations
    .map((conversation) => {
      const timeline = messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      const pairs: number[] = []
      for (let index = 0; index < timeline.length; index += 1) {
        const current = timeline[index]
        if (current.direction !== 'outgoing') continue
        const nextInbound = timeline.slice(index + 1).find((message) => message.direction === 'incoming')
        if (!nextInbound) continue
        pairs.push(
          new Date(nextInbound.createdAt).getTime() - new Date(current.createdAt).getTime()
        )
      }
      return pairs
    })
    .flat()
  const responseRateBase = conversations.filter((conversation) =>
    messages.some((message) => message.conversationId === conversation.id && message.direction === 'outgoing')
  )
  const respondingConversations = responseRateBase.filter((conversation) =>
    messages.some((message) => message.conversationId === conversation.id && message.direction === 'incoming')
  )
  const completedChecklist = conversations.reduce(
    (sum, conversation) =>
      sum + conversation.documentChecklist.filter((item) => item.completed).length,
    0
  )
  const totalChecklist = conversations.reduce(
    (sum, conversation) => sum + conversation.documentChecklist.length,
    0
  )
  const interviewConfirmations = data.events.filter(
    (event) => event.agencyId === agencyId && event.type === 'interview_confirmed'
  ).length

  return {
    messagesSent: outgoing.length,
    messagesDelivered: delivered.length,
    messagesRead: read.length,
    responseRate:
      responseRateBase.length > 0
        ? Math.round((respondingConversations.length / responseRateBase.length) * 100)
        : 0,
    averageResponseTimeMinutes:
      responseWindows.length > 0
        ? Math.round(responseWindows.reduce((sum, item) => sum + item, 0) / responseWindows.length / 60000)
        : 0,
    activeConversations: conversations.filter((conversation) => conversation.status !== 'closed').length,
    pendingReplies: conversations.filter((conversation) => conversation.unreadRecruiterCount > 0).length,
    interviewConfirmations,
    documentSubmissionRate:
      totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0,
  }
}

export const listWhatsAppConversations = async (agencyId: number, filters?: {
  stage?: string
  tag?: string
  query?: string
}) => {
  const data = await readData()
  const query = filters?.query?.trim().toLowerCase() ?? ''
  return data.conversations
    .filter((conversation) => conversation.agencyId === agencyId)
    .filter((conversation) =>
      filters?.stage ? conversation.currentStage.toLowerCase() === filters.stage.toLowerCase() : true
    )
    .filter((conversation) =>
      filters?.tag
        ? conversation.tags.some((tag) => tag.toLowerCase() === filters.tag?.toLowerCase())
        : true
    )
    .filter((conversation) =>
      query
        ? conversation.candidateName.toLowerCase().includes(query) ||
          conversation.candidateReferenceCode.toLowerCase().includes(query) ||
          conversation.phoneNumber.toLowerCase().includes(query)
        : true
    )
    .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime())
}

export const listWhatsAppTemplates = async (agencyId: number) => {
  const data = await readData()
  ensureTemplatesForAgency(data, agencyId)
  await writeData(data)
  return data.templates
    .filter((template) => template.agencyId === agencyId)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export const upsertWhatsAppTemplate = async (input: {
  agencyId: number
  id?: string
  key: string
  name: string
  category: WhatsAppTemplateCategory
  language?: string
  body: string
  variables?: string[]
  active?: boolean
}) => {
  const data = await readData()
  const existingIndex = data.templates.findIndex(
    (template) => template.agencyId === input.agencyId && template.id === input.id
  )
  const record: WhatsAppTemplateRecord = {
    id: existingIndex === -1 ? randomUUID() : data.templates[existingIndex].id,
    agencyId: input.agencyId,
    key: sanitizePathSegment(input.key, 'template').toLowerCase(),
    name: input.name.trim(),
    category: input.category,
    language: input.language?.trim() || 'en',
    body: input.body.trim(),
    variables: uniqueStrings(input.variables ?? []),
    active: input.active ?? true,
    createdAt: existingIndex === -1 ? now() : data.templates[existingIndex].createdAt,
    updatedAt: now(),
  }
  if (existingIndex === -1) data.templates.unshift(record)
  else data.templates[existingIndex] = record
  await writeData(data)
  return record
}

export const createWhatsAppBroadcast = async (input: {
  agencyId: number
  createdBy: string
  name: string
  candidateReferenceCodes: string[]
  text?: string
  templateKey?: string
}) => {
  const messageIds: string[] = []
  for (const referenceCode of uniqueStrings(input.candidateReferenceCodes)) {
    const result = await sendWhatsAppMessage({
      agencyId: input.agencyId,
      candidateReferenceCode: referenceCode,
      senderName: input.createdBy,
      text: input.text,
      templateKey: input.templateKey,
      automated: true,
    })
    const latest = result.messages[result.messages.length - 1]
    if (latest) {
      messageIds.push(latest.id)
    }
  }

  const data = await readData()
  const record: WhatsAppBroadcastRecord = {
    id: randomUUID(),
    agencyId: input.agencyId,
    name: input.name.trim(),
    filterSummary: `${input.candidateReferenceCodes.length} recipients`,
    recipientCount: input.candidateReferenceCodes.length,
    messageIds,
    createdBy: input.createdBy,
    createdAt: now(),
  }
  data.broadcasts.unshift(record)
  messageIds.forEach((messageId) => {
    const message = data.messages.find((item) => item.id === messageId)
    if (!message) return
    data.events.unshift(
      createEvent(
        input.agencyId,
        message.conversationId,
        message.candidateReferenceCode,
        'broadcast_sent',
        `Broadcast "${record.name}" sent`,
        {
          broadcastId: record.id,
        },
        message.id
      )
    )
  })
  await writeData(data)
  return record
}
