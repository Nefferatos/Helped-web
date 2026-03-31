import express, { Router } from 'express'
import {
  getAdminChatConversations,
  getAdminChatSummary,
  getAdminChatMessages,
  getMyChatConversations,
  getMyChatSummary,
  getMyChatMessages,
  sendAdminChatMessage,
  sendMyChatMessage,
} from '../controllers/chatController'

const router: Router = express.Router()

router.get('/client/conversations', getMyChatConversations)
router.get('/client/summary', getMyChatSummary)
router.get('/client', getMyChatMessages)
router.post('/client', sendMyChatMessage)
router.get('/admin', getAdminChatConversations)
router.get('/admin/summary', getAdminChatSummary)
router.get('/admin/:clientId', getAdminChatMessages)
router.post('/admin/:clientId', sendAdminChatMessage)

export default router
