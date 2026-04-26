import express, { Router } from 'express'
import {
  getRequestMessages,
  postRequestMessage,
} from '../controllers/requestMessageController'

const router: Router = express.Router()

router.get('/:conversationId', getRequestMessages)
router.post('/', postRequestMessage)

export default router
