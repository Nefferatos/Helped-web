import express, { Router } from 'express'
import {
  createEnquiry,
  deleteEnquiry,
  getEnquiries,
  getUnreadEnquiryCount,
} from '../controllers/enquiryController'

const router: Router = express.Router()

router.get('/', getEnquiries)
router.get('/unread-count', getUnreadEnquiryCount)
router.post('/', createEnquiry)
router.delete('/:id', deleteEnquiry)

export default router
