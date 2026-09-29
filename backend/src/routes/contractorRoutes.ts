import { Router } from 'express'
import { completeContractorJob, completePlacementMilestone, listContractorJobs } from '../controllers/contractorController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'
const router = Router()
// Operations Center uses an agency-admin session locally. The deployment has
// an equivalent Worker route, but this keeps local development on the same
// Express authentication store as the rest of the portal.
router.get('/tasks', requireAgencyAuth, listContractorJobs)
router.post('/tasks/:id/complete', requireAgencyAuth, completeContractorJob)
router.post('/placements/:placementId/milestones/:milestone', requireAgencyAuth, completePlacementMilestone)
export default router
