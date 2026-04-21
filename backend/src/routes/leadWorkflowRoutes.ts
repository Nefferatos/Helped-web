import express, { Router } from 'express'
import {
  createLead,
  ingestRawLead,
  listLeads,
} from '../controllers/leadWorkflowController'

const router: Router = express.Router()

router.get('/', listLeads)
router.post('/', createLead)
router.post('/raw', ingestRawLead)

export default router
