import express, { Router } from 'express'
import {
  autonomousRun,
  autonomousScan,
  generateCampaign,
  getAudienceOptions,
  updateAudienceConsent,
  getCampaignById,
  getCampaigns,
  sendCampaignEmail,
} from '../controllers/directMarketingController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.use(requireAgencyAuth)
// Marketing contains contact details and permission controls; exclude
// document reviewers, contractors, employers, and candidate accounts.
router.use(requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff'))

router.get('/audience', getAudienceOptions)
router.post('/audience/consent', updateAudienceConsent)
router.post('/generate', generateCampaign)
router.get('/campaigns', getCampaigns)
router.get('/campaigns/:id', getCampaignById)
router.post('/send-email', sendCampaignEmail)

// Autonomous agent
router.get('/autonomous/scan', autonomousScan)
router.post('/autonomous/run', autonomousRun)

export default router
