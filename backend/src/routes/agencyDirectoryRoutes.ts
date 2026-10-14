import express, { Router } from 'express'
import { listAgencies } from '../controllers/agencyDirectoryController'
import {
  listAgencyReviews,
  removeAgencyReview,
  saveAgencyReview,
} from '../controllers/agencyReviewController'

const router: Router = express.Router()

router.get('/', listAgencies)

// Google-Maps-style ratings & reviews for an agency.
router.get('/:agencyId/reviews', listAgencyReviews)
router.post('/:agencyId/reviews', saveAgencyReview)
router.delete('/:agencyId/reviews/:reviewId', removeAgencyReview)

export default router
