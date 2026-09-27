import { Router } from 'express'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'
import { syncToGoogleDrive, transcribeMedia, uploadAndSyncToGoogleDrive } from '../controllers/integrationController'
const router = Router()
router.post('/google-drive/upload-and-sync', requireAgencyAuth, uploadAndSyncToGoogleDrive)
router.post('/google-drive/sync', requireAgencyAuth, syncToGoogleDrive)
router.post('/media/transcribe', requireAgencyAuth, transcribeMedia)
export default router
