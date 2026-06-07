import express, { Router } from 'express'
import { processInquiry, receptionist } from '../controllers/aiController'

const router: Router = express.Router()

router.post('/receptionist', receptionist)
router.post('/processInquiry', processInquiry)

export default router
