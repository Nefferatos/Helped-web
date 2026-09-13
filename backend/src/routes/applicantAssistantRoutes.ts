import express, { Router } from 'express'
import { chat, getTracker, createTracker } from '../controllers/applicantAssistantController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.post('/chat', requireAgencyAuth, chat)
router.get('/tracker', requireAgencyAuth, getTracker)
router.post('/tracker', requireAgencyAuth, createTracker)

export default router