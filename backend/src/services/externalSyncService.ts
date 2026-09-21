import { randomUUID } from 'crypto'
import { query, sql } from '../db'
import { createPrivateSignedUrl, isPrivateStorageRef } from './privateStorageService'

const postWebhook = async (url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const text = await response.text().catch(() => '')
  if (!response.ok) throw new Error(`SYNC_WEBHOOK_FAILED:${response.status}`)
  try { return JSON.parse(text) as Record<string, unknown> } catch { return { text } }
}

const createSyncJob = async (input: { agencyId: number; provider: 'GOOGLE_DRIVE' | 'MAKE_MEDIA'; action: string; payload: Record<string, unknown> }) => {
  const result = await query(sql`
    INSERT INTO external_sync_jobs (agency_id, provider, action, status, payload)
    VALUES (${input.agencyId}, ${input.provider}, ${input.action}, 'PENDING', ${JSON.stringify(input.payload)}::jsonb)
    RETURNING id
  `)
  return String(result.rows[0]?.id ?? randomUUID())
}

const completeSyncJob = async (id: string, status: 'COMPLETED' | 'FAILED', result: Record<string, unknown>) => {
  await query(sql`UPDATE external_sync_jobs SET status = ${status}, result = ${JSON.stringify(result)}::jsonb, completed_at = NOW() WHERE id = ${id}::uuid`)
}

/** Sends a time-limited private-object URL to a Make scenario that owns Google Drive credentials. */
export const syncPrivateDocumentToGoogleDrive = async (input: {
  agencyId: number; storageRef: string; fileName: string; folderKey?: string; entityType?: string; entityId?: string
}) => {
  if (!isPrivateStorageRef(input.storageRef)) throw new Error('A private Supabase storage reference is required')
  const webhookUrl = process.env.MAKE_WEBHOOK_URL_GOOGLE_DRIVE_SYNC?.trim()
  if (!webhookUrl) throw new Error('GOOGLE_DRIVE_SYNC_NOT_CONFIGURED')
  const jobId = await createSyncJob({ agencyId: input.agencyId, provider: 'GOOGLE_DRIVE', action: 'upload', payload: { ...input, storageRef: input.storageRef } })
  try {
    const result = await postWebhook(webhookUrl, { ...input, downloadUrl: await createPrivateSignedUrl(input.storageRef, 900), syncJobId: jobId })
    await completeSyncJob(jobId, 'COMPLETED', result)
    return { jobId, result }
  } catch (error) {
    await completeSyncJob(jobId, 'FAILED', { error: error instanceof Error ? error.message : String(error) }).catch(() => undefined)
    throw error
  }
}

/** Delegates voice/audio transcription to Make, while leaving media private in Storage. */
export const transcribePrivateMedia = async (input: { agencyId: number; storageRef: string; language?: string }) => {
  if (!isPrivateStorageRef(input.storageRef)) throw new Error('A private Supabase storage reference is required')
  const webhookUrl = process.env.MAKE_WEBHOOK_URL_MEDIA_TRANSCRIBE?.trim()
  if (!webhookUrl) throw new Error('MEDIA_TRANSCRIBE_NOT_CONFIGURED')
  const jobId = await createSyncJob({ agencyId: input.agencyId, provider: 'MAKE_MEDIA', action: 'transcribe', payload: { storageRef: input.storageRef, language: input.language ?? '' } })
  try {
    const result = await postWebhook(webhookUrl, { ...input, mediaUrl: await createPrivateSignedUrl(input.storageRef, 900), syncJobId: jobId })
    await completeSyncJob(jobId, 'COMPLETED', result)
    return { jobId, transcript: String(result.transcript ?? result.text ?? ''), result }
  } catch (error) {
    await completeSyncJob(jobId, 'FAILED', { error: error instanceof Error ? error.message : String(error) }).catch(() => undefined)
    throw error
  }
}
