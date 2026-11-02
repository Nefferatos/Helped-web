import { Router } from 'express'
import { completeContractorJob, completePlacementMilestone, listContractorJobs } from '../controllers/contractorController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'
const router = Router()
// Operations Center uses an agency-admin session locally. The deployment has
// an equivalent Worker route, but this keeps local development on the same
// Express authentication store as the rest of the portal.
const canManageContractorTasks = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff')
router.get('/tasks', requireAgencyAuth, canManageContractorTasks, listContractorJobs)
router.post('/tasks/:id/complete', requireAgencyAuth, canManageContractorTasks, completeContractorJob)
router.post('/placements/:placementId/milestones/:milestone', requireAgencyAuth, canManageContractorTasks, completePlacementMilestone)
export default router
