import express, { Router } from 'express'
import {
  generateCampaign,
  getAudienceOptions,
  getCampaignById,
  getCampaigns,
} from '../controllers/directMarketingController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.use(requireAgencyAuth)

router.get('/audience', getAudienceOptions)
router.post('/generate', generateCampaign)
router.get('/campaigns', getCampaigns)
router.get('/campaigns/:id', getCampaignById)

export default router
