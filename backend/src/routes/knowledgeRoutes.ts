import { Router } from 'express'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'
import { indexKnowledge, searchKnowledge } from '../controllers/knowledgeController'

const router = Router()
router.post('/documents', requireAgencyAuth, indexKnowledge)
router.get('/search', requireAgencyAuth, searchKnowledge)
export default router
