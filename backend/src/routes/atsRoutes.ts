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

const router: Router = express.Router()

router.post('/public/apply', createPublicAtsApplicationController)
router.get('/public/applications/:applicationId', getPublicAtsApplicationSummaryController)
router.get('/dashboard', getAtsDashboardController)
router.get('/applications', listAtsApplicationsController)
router.post('/sync-from-maids', syncAtsFromMaidsController)
router.get('/presets', listAtsPresetsController)
router.post('/presets', saveAtsPresetController)
router.post('/bulk-actions', bulkAtsActionController)
router.post('/match', matchAtsApplicationsController)
router.get('/applications/:applicationId', getAtsApplicationController)
router.patch('/applications/:applicationId/stage', updateAtsStageController)
router.put('/applications/:applicationId/interview', upsertInterviewController)
router.put('/applications/:applicationId/background-check', upsertBackgroundCheckController)

export default router
