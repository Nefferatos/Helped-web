import express, { Router } from 'express'
import {
  createEnquiry,
  deleteEnquiry,
  getEnquiries,
  getUnreadEnquiryCount,
  updateEnquiry,
} from '../controllers/enquiryController'

const router: Router = express.Router()

router.get('/', getEnquiries)
router.get('/unread-count', getUnreadEnquiryCount)
router.post('/', createEnquiry)
router.patch('/:id', updateEnquiry)
router.delete('/:id', deleteEnquiry)

export default router
