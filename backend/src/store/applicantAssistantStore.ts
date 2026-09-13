import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type {
  ApplicantAssistantAuditRecord,
  ApplicantAssistantConversation,
  ApplicantAssistantMessage,
  ApplicantTrackerRecord,
  GoogleDocLinkRecord,
  TrackerItem,
} from '../types/applicantAssistant'

interface ApplicantAssistantData {
  trackers: ApplicantTrackerRecord[]
  conversations: ApplicantAssistantConversation[]
  auditLog: ApplicantAssistantAuditRecord[]
  googleDocLinks: GoogleDocLinkRecord[]
  processedRequestIds: string[]
  counters: { trackers: number; conversations: number; auditLog: number }
}

const now = () => new Date().toISOString()
const dataDir = path.resolve(__dirname, '../../data')
const dataFile = path.join(dataDir, 'applicant-assistant-data.json')

const defaultData = (): ApplicantAssistantData => ({
  trackers: [],
  conversations: [],
  auditLog: [],
  googleDocLinks: [],
  processedRequestIds: [],
  counters: { trackers: 1, conversations: 1, auditLog: 1 },
})

let cache: ApplicantAssistantData | null = null

const ensureDataDir = async () => {
  await mkdir(dataDir, { recursive: true })
  try { await readFile(dataFile, 'utf8') } catch { await writeFile(dataFile, JSON.stringify(defaultData(), null, 2), 'utf8') }
}

const readData = async (): Promise<ApplicantAssistantData> => {
  if (cache) return cache
  await ensureDataDir()
  const raw = await readFile(dataFile, 'utf8')
  const parsed = JSON.parse(raw) as Partial<ApplicantAssistantData>
  cache = {
    ...defaultData(),
    ...parsed,
    trackers: parsed.trackers ?? [],
    conversations: parsed.conversations ?? [],
    auditLog: parsed.auditLog ?? [],
    googleDocLinks: parsed.googleDocLinks ?? [],
    processedRequestIds: parsed.processedRequestIds ?? [],
    counters: { ...defaultData().counters, ...parsed.counters },
  }
  return cache
}

const writeData = async (data: ApplicantAssistantData) => {
  cache = data
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8')
}

// ─── Request deduplication ─────────────────────────────────────────────────

const MAX_PROCESSED_REQUEST_IDS = 5000

export const isRequestAlreadyProcessed = async (requestId: string) => {
  if (!requestId.trim()) return false
  const data = await readData()
  return data.processedRequestIds.includes(requestId)
}

export const markRequestProcessed = async (requestId: string) => {
  if (!requestId.trim()) return
  const data = await readData()
  if (!data.processedRequestIds.includes(requestId)) {
    data.processedRequestIds.push(requestId)
    if (data.processedRequestIds.length > MAX_PROCESSED_REQUEST_IDS) {
      data.processedRequestIds = data.processedRequestIds.slice(-MAX_PROCESSED_REQUEST_IDS)
    }
    await writeData(data)
  }
}

// ─── Conversations ─────────────────────────────────────────────────────────

export const createConversation = async (payload: {
  agencyId: number
  userId: string
  selectedApplicantIds?: string[]
}): Promise<ApplicantAssistantConversation> => {
  const data = await readData()
  const conversation: ApplicantAssistantConversation = {
    id: randomUUID(),
    agencyId: payload.agencyId,
    userId: payload.userId,
    messages: [],
    selectedApplicantIds: payload.selectedApplicantIds ?? [],
    currentTrackerId: null,
    createdAt: now(),
    updatedAt: now(),
  }
  data.conversations.push(conversation)
  data.counters.conversations++
  await writeData(data)
  return conversation
}

export const getConversation = async (conversationId: string): Promise<ApplicantAssistantConversation | null> => {
  const data = await readData()
  return data.conversations.find((c) => c.id === conversationId) ?? null
}

export const addMessageToConversation = async (conversationId: string, message: ApplicantAssistantMessage): Promise<void> => {
  const data = await readData()
  const conversation = data.conversations.find((c) => c.id === conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  conversation.messages.push(message)
  conversation.updatedAt = now()
  await writeData(data)
}

export const updateConversationContext = async (
  conversationId: string,
  updates: { selectedApplicantIds?: string[]; currentTrackerId?: string | null },
): Promise<void> => {
  const data = await readData()
  const conversation = data.conversations.find((c) => c.id === conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (updates.selectedApplicantIds !== undefined) conversation.selectedApplicantIds = updates.selectedApplicantIds
  if (updates.currentTrackerId !== undefined) conversation.currentTrackerId = updates.currentTrackerId
  conversation.updatedAt = now()
  await writeData(data)
}

export const listConversationsForAgency = async (agencyId: number): Promise<ApplicantAssistantConversation[]> => {
  const data = await readData()
  return data.conversations
    .filter((c) => c.agencyId === agencyId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// ─── Trackers ──────────────────────────────────────────────────────────────

export const createTracker = async (payload: {
  agencyId: number
  name: string
  description: string
  items: TrackerItem[]
  createdBy: string
}): Promise<ApplicantTrackerRecord> => {
  const data = await readData()
  const tracker: ApplicantTrackerRecord = {
    id: randomUUID(),
    agencyId: payload.agencyId,
    name: payload.name,
    description: payload.description,
    items: payload.items,
    googleDocId: null,
    googleDocUrl: null,
    createdAt: now(),
    updatedAt: now(),
    createdBy: payload.createdBy,
  }
  data.trackers.push(tracker)
  data.counters.trackers++
  await writeData(data)
  return tracker
}

export const getTracker = async (trackerId: string): Promise<ApplicantTrackerRecord | null> => {
  const data = await readData()
  return data.trackers.find((t) => t.id === trackerId) ?? null
}

export const getActiveTrackerForAgency = async (agencyId: number): Promise<ApplicantTrackerRecord | null> => {
  const data = await readData()
  const agencyTrackers = data.trackers
    .filter((t) => t.agencyId === agencyId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return agencyTrackers[0] ?? null
}

export const listTrackersForAgency = async (agencyId: number): Promise<ApplicantTrackerRecord[]> => {
  const data = await readData()
  return data.trackers
    .filter((t) => t.agencyId === agencyId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export const updateTracker = async (
  trackerId: string,
  updates: { name?: string; description?: string; items?: TrackerItem[]; googleDocId?: string | null; googleDocUrl?: string | null },
): Promise<ApplicantTrackerRecord> => {
  const data = await readData()
  const tracker = data.trackers.find((t) => t.id === trackerId)
  if (!tracker) throw new Error('TRACKER_NOT_FOUND')
  if (updates.name !== undefined) tracker.name = updates.name
  if (updates.description !== undefined) tracker.description = updates.description
  if (updates.items !== undefined) tracker.items = updates.items
  if (updates.googleDocId !== undefined) tracker.googleDocId = updates.googleDocId
  if (updates.googleDocUrl !== undefined) tracker.googleDocUrl = updates.googleDocUrl
  tracker.updatedAt = now()
  await writeData(data)
  return tracker
}

export const deleteTracker = async (trackerId: string): Promise<void> => {
  const data = await readData()
  data.trackers = data.trackers.filter((t) => t.id !== trackerId)
  await writeData(data)
}

// ─── Google Doc Links ──────────────────────────────────────────────────────

export const saveGoogleDocLink = async (payload: {
  agencyId: number
  trackerId: string
  documentId: string
  documentUrl: string
}): Promise<GoogleDocLinkRecord> => {
  const data = await readData()
  const existing = data.googleDocLinks.find((link) => link.trackerId === payload.trackerId)
  if (existing) {
    existing.documentId = payload.documentId
    existing.documentUrl = payload.documentUrl
    existing.updatedAt = now()
    await writeData(data)
    return existing
  }
  const record: GoogleDocLinkRecord = {
    id: randomUUID(), agencyId: payload.agencyId, trackerId: payload.trackerId,
    documentId: payload.documentId, documentUrl: payload.documentUrl,
    createdAt: now(), updatedAt: now(),
  }
  data.googleDocLinks.push(record)
  await writeData(data)
  return record
}

export const getGoogleDocLinkForTracker = async (trackerId: string): Promise<GoogleDocLinkRecord | null> => {
  const data = await readData()
  return data.googleDocLinks.find((link) => link.trackerId === trackerId) ?? null
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export const addAuditRecord = async (record: Omit<ApplicantAssistantAuditRecord, 'id' | 'timestamp'>): Promise<ApplicantAssistantAuditRecord> => {
  const data = await readData()
  const auditRecord: ApplicantAssistantAuditRecord = { id: randomUUID(), timestamp: now(), ...record }
  data.auditLog.push(auditRecord)
  data.counters.auditLog++
  if (data.auditLog.length > 2000) data.auditLog = data.auditLog.slice(-2000)
  await writeData(data)
  return auditRecord
}

export const getAuditLogForAgency = async (agencyId: number, options?: { limit?: number; offset?: number }): Promise<ApplicantAssistantAuditRecord[]> => {
  const data = await readData()
  const filtered = data.auditLog
    .filter((r) => r.agencyId === agencyId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 50
  return filtered.slice(offset, offset + limit)
}