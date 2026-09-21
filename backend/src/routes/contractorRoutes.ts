import { Router } from 'express'
import { completeContractorJob } from '../controllers/contractorController'
import { requireContractor } from '../middleware/requireAgencyAuth'
const router = Router()
router.post('/tasks/:id/complete', requireContractor, completeContractorJob)
export default router
