import express, { Router } from 'express'
import {
  getWhatsAppCandidateConversation,
  getWhatsAppConversations,
  getWhatsAppMetrics,
  getWhatsAppTemplates,
  patchWhatsAppCandidateStage,
  postWhatsAppBroadcast,
  postWhatsAppCandidateMessage,
  postWhatsAppInbound,
  putWhatsAppTemplate,
} from '../controllers/whatsappController'

const router: Router = express.Router()

router.get('/dashboard/metrics', getWhatsAppMetrics)
router.get('/conversations', getWhatsAppConversations)
router.get('/templates', getWhatsAppTemplates)
router.put('/templates', putWhatsAppTemplate)
router.post('/broadcasts', postWhatsAppBroadcast)
router.post('/inbound', postWhatsAppInbound)
router.get('/candidates/:referenceCode', getWhatsAppCandidateConversation)
router.post('/candidates/:referenceCode/messages', postWhatsAppCandidateMessage)
router.patch('/candidates/:referenceCode/stage', patchWhatsAppCandidateStage)

export default router
