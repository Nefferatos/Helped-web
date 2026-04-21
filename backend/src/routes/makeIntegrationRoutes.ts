import express, { Router } from 'express'
import { createLead, sendMessage, sendToMake } from '../controllers/makeIntegrationController'

const router: Router = express.Router()

router.post('/send-to-make', sendToMake)
router.post('/send-message', sendMessage)
router.post('/leads', createLead)

export default router
