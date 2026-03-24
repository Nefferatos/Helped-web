import express, { Router } from 'express'
import {
  createEnquiry,
  deleteEnquiry,
  getEnquiries,
} from '../controllers/enquiryController'

const router: Router = express.Router()

router.get('/', getEnquiries)
router.post('/', createEnquiry)
router.delete('/:id', deleteEnquiry)

export default router
