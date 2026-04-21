import express, { Router } from 'express'
import { handleInquiry } from '../controllers/inquiryWorkflowController'

const router: Router = express.Router()

router.post('/', handleInquiry)

export default router
