import express, { Router } from 'express'
import {
  getAdminChatLastId,
  getAdminChatbotConfig,
  getAdminChatConversations,
  getAdminChatSummary,
  getAdminChatMessages,
  getMyChatLastId,
  getMyChatbotConfig,
  getMyChatConversations,
  getMyChatSummary,
  getMyChatMessages,
  postMyChatBotReply,
  sendAdminChatMessage,
  sendMyChatMessage,
  streamAdminChatMessages,
  streamMyChatMessages,
  updateAdminConversationMeta,
  updateAdminChatbotConfig,
} from '../controllers/chatController'

const router: Router = express.Router()

router.get('/client/conversations', getMyChatConversations)
router.get('/client/config', getMyChatbotConfig)
router.get('/client/last-id', getMyChatLastId)
router.get('/client/stream', streamMyChatMessages)
router.get('/client/summary', getMyChatSummary)
router.get('/client', getMyChatMessages)
router.post('/client', sendMyChatMessage)
router.post('/client/bot-reply', postMyChatBotReply)
router.get('/admin', getAdminChatConversations)
router.get('/admin/config', getAdminChatbotConfig)
router.put('/admin/config', updateAdminChatbotConfig)
router.get('/admin/last-id', getAdminChatLastId)
router.get('/admin/stream', streamAdminChatMessages)
router.get('/admin/summary', getAdminChatSummary)
router.get('/admin/:clientId', getAdminChatMessages)
router.post('/admin/:clientId', sendAdminChatMessage)
router.patch('/admin/:clientId', updateAdminConversationMeta)

export default router
