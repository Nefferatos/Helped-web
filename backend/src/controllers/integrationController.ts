import type { Request, Response } from 'express'
import { getRequestAgencyId } from '../auth'
import { syncPrivateDocumentToGoogleDrive, transcribePrivateMedia } from '../services/externalSyncService'

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
