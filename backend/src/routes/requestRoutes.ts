import express, { Router } from 'express'
import {
  createRequest,
  getRequest,
  getRequestStatusCounts,
  getUnreadRequestCount,
  markRequestsViewed,
  listRequests,
  patchRequestMaids,
  patchRequestStatus,
} from '../controllers/requestController'

const router: Router = express.Router()

router.get('/', listRequests)
router.post('/', createRequest)
router.get('/unread-count', getUnreadRequestCount)
router.post('/mark-viewed', markRequestsViewed)
router.get('/status-counts', getRequestStatusCounts)
router.get('/:id', getRequest)
router.patch('/:id/status', patchRequestStatus)
router.patch('/:id/maids', patchRequestMaids)

export default router
