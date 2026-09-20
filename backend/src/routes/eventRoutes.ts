import express, { Router } from 'express'
import {
  createEventController,
  eventHealthController,
  listEventsController,
} from '../controllers/eventController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

// Machine-to-machine ingestion (Make.com reports results back). Shared-secret authed.
router.post('/', createEventController)
router.get('/health', eventHealthController)

// Human timeline reads (agency dashboard). Session authed.
router.get('/', requireAgencyAuth, listEventsController)

export default router
