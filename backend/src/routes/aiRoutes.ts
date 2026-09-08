import express, { Router } from 'express'
import { processInquiry, receptionist } from '../controllers/aiController'
import { pdfAutofill } from '../controllers/pdfAutofillController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.post('/receptionist', receptionist)
router.post('/processInquiry', processInquiry)
router.post('/pdf-autofill', requireAgencyAuth, pdfAutofill)

export default router
