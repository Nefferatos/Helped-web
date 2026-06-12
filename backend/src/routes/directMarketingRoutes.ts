import express, { Router } from 'express'
import {
  autonomousRun,
  autonomousScan,
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

// Autonomous agent
router.get('/autonomous/scan', autonomousScan)
router.post('/autonomous/run', autonomousRun)

export default router
