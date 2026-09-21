import { Router } from 'express'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'
import { syncToGoogleDrive, transcribeMedia } from '../controllers/integrationController'
const router = Router()
router.post('/google-drive/sync', requireAgencyAuth, syncToGoogleDrive)
router.post('/media/transcribe', requireAgencyAuth, transcribeMedia)
export default router
