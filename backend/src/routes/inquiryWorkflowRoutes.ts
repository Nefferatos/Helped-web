import express, { Router } from 'express'
import {
  handleInquiry,
  handleInquiryForMake,
} from '../controllers/inquiryWorkflowController'

const router: Router = express.Router()

router.post('/make', handleInquiryForMake)
router.post('/', handleInquiry)

export default router
