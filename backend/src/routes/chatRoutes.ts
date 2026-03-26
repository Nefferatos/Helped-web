import express, { Router } from 'express'
import {
  getAdminChatConversations,
  getAdminChatMessages,
  getMyChatMessages,
  sendAdminChatMessage,
  sendMyChatMessage,
} from '../controllers/chatController'

const router: Router = express.Router()

router.get('/client', getMyChatMessages)
router.post('/client', sendMyChatMessage)
router.get('/admin', getAdminChatConversations)
router.get('/admin/:clientId', getAdminChatMessages)
router.post('/admin/:clientId', sendAdminChatMessage)

export default router
