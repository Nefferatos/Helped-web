import express, { Router } from 'express'
import {
  bulkAtsActionController,
  createPublicAtsApplicationController,
  getAtsApplicationController,
  getAtsDashboardController,
  getUnreadAtsApplicationCountController,
  getPublicAtsApplicationSummaryController,
  listAtsApplicationsController,
  listAtsPresetsController,
  matchAtsApplicationsController,
  markAtsApplicationsViewedController,
  saveAtsPresetController,
  submitPublicMaidReferralController,
  syncAtsFromMaidsController,
  updateAtsStageController,
  upsertBackgroundCheckController,
  upsertInterviewController,
} from '../controllers/atsController'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

const canReviewApplicant = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')
const canRecruitApplicant = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff')

router.post('/public/apply', createPublicAtsApplicationController)
router.post('/public/referrals', submitPublicMaidReferralController)
router.get('/public/applications/:applicationId', getPublicAtsApplicationSummaryController)
router.get('/dashboard', requireAgencyAuth, canReviewApplicant, getAtsDashboardController)
router.get('/applications', requireAgencyAuth, canReviewApplicant, listAtsApplicationsController)
router.get('/applications/unread-count', requireAgencyAuth, canReviewApplicant, getUnreadAtsApplicationCountController)
router.post('/applications/mark-viewed', requireAgencyAuth, canReviewApplicant, markAtsApplicationsViewedController)
router.post('/sync-from-maids', requireAgencyAuth, canRecruitApplicant, syncAtsFromMaidsController)
router.get('/presets', requireAgencyAuth, canRecruitApplicant, listAtsPresetsController)
router.post('/presets', requireAgencyAuth, canRecruitApplicant, saveAtsPresetController)
router.post('/bulk-actions', requireAgencyAuth, canRecruitApplicant, bulkAtsActionController)
router.post('/match', requireAgencyAuth, canRecruitApplicant, matchAtsApplicationsController)
router.get('/applications/:applicationId', requireAgencyAuth, canReviewApplicant, getAtsApplicationController)
router.patch('/applications/:applicationId/stage', requireAgencyAuth, canRecruitApplicant, updateAtsStageController)
router.put('/applications/:applicationId/interview', requireAgencyAuth, canRecruitApplicant, upsertInterviewController)
router.put('/applications/:applicationId/background-check', requireAgencyAuth, canReviewApplicant, upsertBackgroundCheckController)

export default router
