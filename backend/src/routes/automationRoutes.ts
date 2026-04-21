import express, { Router } from 'express'
import {
  notifyWorkflow,
  sendMessage,
  sendToMake,
} from '../controllers/automationController'

const router: Router = express.Router()

router.post('/notify', notifyWorkflow)
router.post('/send-message', sendMessage)
router.post('/send-to-make', sendToMake)

export default router
