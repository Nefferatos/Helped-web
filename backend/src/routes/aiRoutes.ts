import express, { Router } from 'express'
import { processInquiry } from '../controllers/aiController'

const router: Router = express.Router()

router.post('/processInquiry', processInquiry)

export default router
