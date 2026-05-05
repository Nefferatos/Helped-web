import express, { Router } from 'express'
import { matchMaids } from '../controllers/matchController'
import {
  generateContract,
  scheduleInterview,
} from '../controllers/matchingWorkflowController'

const router: Router = express.Router()

router.post('/match', matchMaids)
router.post('/schedule', scheduleInterview)
router.post('/contracts/generate', generateContract)

export default router
