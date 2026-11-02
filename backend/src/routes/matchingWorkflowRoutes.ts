import express, { Router } from 'express'
import { matchMaids } from '../controllers/matchController'
import {
  generateContract,
  scheduleInterview,
} from '../controllers/matchingWorkflowController'
import { getRequirements, saveRequirements } from '../controllers/employerRequirementsController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.use(requireAgencyAuth)
// Matching exposes applicant profile data; only agency recruitment and
// operations roles may search, schedule interviews, generate contracts, or
// read/update employer requirements.
router.use(requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff'))

router.post('/match', matchMaids)
router.post('/schedule', scheduleInterview)
router.post('/contracts/generate', generateContract)
router.get('/employers/:employerId/requirements', getRequirements)
router.put('/employers/:employerId/requirements', saveRequirements)

export default router
