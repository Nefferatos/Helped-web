import express, { Router } from 'express'
import {
  bulkAtsActionController,
  createPublicAtsApplicationController,
  getAtsApplicationController,
  getAtsDashboardController,
  getPublicAtsApplicationSummaryController,
  listAtsApplicationsController,
  listAtsPresetsController,
  matchAtsApplicationsController,
  saveAtsPresetController,
  syncAtsFromMaidsController,
  updateAtsStageController,
  upsertBackgroundCheckController,
  upsertInterviewController,
} from '../controllers/atsController'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router: Router = express.Router()

router.post('/public/apply', createPublicAtsApplicationController)
router.get('/public/applications/:applicationId', getPublicAtsApplicationSummaryController)
router.get('/dashboard', requireAgencyAuth, getAtsDashboardController)
router.get('/applications', requireAgencyAuth, listAtsApplicationsController)
router.post('/sync-from-maids', requireAgencyAuth, syncAtsFromMaidsController)
router.get('/presets', requireAgencyAuth, listAtsPresetsController)
router.post('/presets', requireAgencyAuth, saveAtsPresetController)
router.post('/bulk-actions', requireAgencyAuth, bulkAtsActionController)
router.post('/match', requireAgencyAuth, matchAtsApplicationsController)
router.get('/applications/:applicationId', requireAgencyAuth, getAtsApplicationController)
router.patch('/applications/:applicationId/stage', requireAgencyAuth, updateAtsStageController)
router.put('/applications/:applicationId/interview', requireAgencyAuth, upsertInterviewController)
router.put('/applications/:applicationId/background-check', requireAgencyAuth, upsertBackgroundCheckController)

export default router
