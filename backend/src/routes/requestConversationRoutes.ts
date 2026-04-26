import express, { Router } from 'express'
import { getRequestConversation } from '../controllers/requestMessageController'

const router: Router = express.Router()

router.get('/:requestId', getRequestConversation)

export default router
