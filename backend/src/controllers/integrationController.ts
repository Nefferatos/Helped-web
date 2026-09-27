import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getRequestAgencyId } from '../auth'
import { syncPrivateDocumentToGoogleDrive, transcribePrivateMedia } from '../services/externalSyncService'
import { makePrivateStoragePath, uploadPrivateObject } from '../services/privateStorageService'

const MAX_DRIVE_UPLOAD_BYTES = 25 * 1024 * 1024

const parseMultipartRequest = async (req: Request) => {
  const requestUrl = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`
  const requestCtor = (globalThis as unknown as {
    Request: new (input: string, init: { method: string; headers: Record<string, string>; body: unknown; duplex: 'half' }) => { formData: () => Promise<{ get: (name: string) => unknown }> }
  }).Request
  const webRequest = new requestCtor(requestUrl, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).flatMap(([key, value]) => typeof value === 'string' ? [[key, value]] : Array.isArray(value) ? [[key, value.join(', ')]] : [])),
    body: req,
    duplex: 'half',
  })
  return await webRequest.formData()
}

const safeFileName = (name: string) => name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document'

/** Upload one staff-selected document privately, then immediately dispatch it to Make. */
export const uploadAndSyncToGoogleDrive = async (req: Request, res: Response) => {
  try {
    if (!/multipart\/form-data/i.test(String(req.headers['content-type'] ?? ''))) return res.status(400).json({ error: 'A document upload is required' })
    const formData = await parseMultipartRequest(req)
    const upload = formData.get('file')
    const folderKey = String(formData.get('folderKey') ?? '').trim()
    if (!upload || typeof upload !== 'object' || typeof (upload as { name?: unknown }).name !== 'string' || typeof (upload as { arrayBuffer?: unknown }).arrayBuffer !== 'function') return res.status(400).json({ error: 'Choose a document to upload' })
    const file = upload as { name: string; type: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> }
    if (!file.name.trim()) return res.status(400).json({ error: 'Choose a valid document' })
    if (typeof file.size === 'number' && file.size > MAX_DRIVE_UPLOAD_BYTES) return res.status(400).json({ error: 'Document must be 25 MB or smaller' })
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length === 0) return res.status(400).json({ error: 'The selected document is empty' })
    if (bytes.length > MAX_DRIVE_UPLOAD_BYTES) return res.status(400).json({ error: 'Document must be 25 MB or smaller' })
    const agencyId = await getRequestAgencyId(req)
    const fileName = safeFileName(file.name)
    const storageRef = await uploadPrivateObject({
      objectPath: makePrivateStoragePath('google-drive-sync', `agency-${agencyId}`, `${randomUUID()}-${fileName}`),
      body: bytes,
      contentType: file.type || 'application/octet-stream',
    })
    const sync = await syncPrivateDocumentToGoogleDrive({ agencyId, storageRef, fileName, folderKey: folderKey || undefined, entityType: 'operations_upload' })
    return res.status(202).json({ ...sync, fileName, storageRef })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Drive sync failed'
    const friendly = message === 'PRIVATE_STORAGE_NOT_CONFIGURED' ? 'Private document storage is not configured' : message === 'GOOGLE_DRIVE_SYNC_NOT_CONFIGURED' ? 'Google Drive workflow is not configured' : message
    return res.status(502).json({ error: friendly })
  }
}

export const syncToGoogleDrive = async (req: Request, res: Response) => {
  try {
    const { storageRef, fileName, folderKey, entityType, entityId } = req.body as Record<string, unknown>
    if (typeof storageRef !== 'string' || typeof fileName !== 'string') return res.status(400).json({ error: 'storageRef and fileName are required' })
    return res.status(202).json(await syncPrivateDocumentToGoogleDrive({
      agencyId: await getRequestAgencyId(req), storageRef, fileName,
      folderKey: typeof folderKey === 'string' ? folderKey : undefined, entityType: typeof entityType === 'string' ? entityType : undefined, entityId: typeof entityId === 'string' ? entityId : undefined,
    }))
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : 'Drive sync failed' }) }
}

export const transcribeMedia = async (req: Request, res: Response) => {
  try {
    const { storageRef, language } = req.body as Record<string, unknown>
    if (typeof storageRef !== 'string') return res.status(400).json({ error: 'storageRef is required' })
    return res.status(202).json(await transcribePrivateMedia({ agencyId: await getRequestAgencyId(req), storageRef, language: typeof language === 'string' ? language : undefined }))
  } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : 'Media transcription failed' }) }
}
