import express, { Router } from 'express'
import {
  getMyAssignedMaids,
  markMyAssignmentDirectHire,
  markMyAssignmentInterested,
  markMyAssignmentRejected,
} from '../controllers/clientController'

const router: Router = express.Router()

router.get('/my-maids', getMyAssignedMaids)
router.patch('/direct-sales/:id/interested', markMyAssignmentInterested)
router.patch('/direct-sales/:id/direct-hire', markMyAssignmentDirectHire)
router.patch('/direct-sales/:id/reject', markMyAssignmentRejected)

export default router
