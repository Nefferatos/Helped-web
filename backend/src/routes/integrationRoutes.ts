import { Router } from 'express'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'
import { syncToGoogleDrive, transcribeMedia, uploadAndSyncToGoogleDrive, uploadAndTranscribeMedia } from '../controllers/integrationController'
const router = Router()
const canProcessPrivateDocuments = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')
router.post('/google-drive/upload-and-sync', requireAgencyAuth, canProcessPrivateDocuments, uploadAndSyncToGoogleDrive)
router.post('/google-drive/sync', requireAgencyAuth, canProcessPrivateDocuments, syncToGoogleDrive)
router.post('/media/transcribe', requireAgencyAuth, canProcessPrivateDocuments, transcribeMedia)
router.post('/media/upload-and-transcribe', requireAgencyAuth, canProcessPrivateDocuments, uploadAndTranscribeMedia)
export default router
