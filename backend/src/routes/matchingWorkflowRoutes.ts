import express, { Router } from 'express'
import { matchMaids } from '../controllers/matchController'
import {
  generateContract,
  scheduleInterview,
} from '../controllers/matchingWorkflowController'
import { getRequirements, saveRequirements } from '../controllers/employerRequirementsController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.post('/match', matchMaids)
router.post('/schedule', scheduleInterview)
router.post('/contracts/generate', generateContract)
router.get('/employers/:employerId/requirements', requireAgencyAuth, getRequirements)
router.put('/employers/:employerId/requirements', requireAgencyAuth, saveRequirements)

export default router
