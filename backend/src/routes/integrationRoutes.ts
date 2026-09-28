import { Router } from 'express'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'
import { syncToGoogleDrive, transcribeMedia, uploadAndSyncToGoogleDrive, uploadAndTranscribeMedia } from '../controllers/integrationController'
const router = Router()
router.post('/google-drive/upload-and-sync', requireAgencyAuth, uploadAndSyncToGoogleDrive)
router.post('/google-drive/sync', requireAgencyAuth, syncToGoogleDrive)
router.post('/media/transcribe', requireAgencyAuth, transcribeMedia)
router.post('/media/upload-and-transcribe', requireAgencyAuth, uploadAndTranscribeMedia)
export default router
