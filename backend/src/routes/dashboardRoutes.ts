import { Router } from 'express'
import { createOperationsPlacement, getOperationsBoard, getOperationsTranscript, getWorkflowDashboardMetrics, getAutomationMonitor, saveOperationsPlacementNote } from '../controllers/dashboardController'
import { matchMaids } from '../controllers/matchController'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth'
import { requireAgencyAuth, requireAgencyRole } from '../middleware/requireAgencyAuth'

const router = Router()
const canViewOperations = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff', 'DOCUMENT_REVIEWER')
const canManageOperations = requireAgencyRole('SUPER_ADMIN', 'admin', 'agency', 'RECRUITER', 'staff')

router.get('/dashboard', getWorkflowDashboardMetrics)
router.get('/dashboard/automations', requireAgencyAuth, canViewOperations, getAutomationMonitor)
router.get('/operations-board', requireAgencyAuth, canViewOperations, getOperationsBoard)
router.post('/operations-board/placements', requireAgencyAuth, canManageOperations, createOperationsPlacement)
router.put('/operations-board/placements/:placementId/notes', requireAgencyAuth, canManageOperations, saveOperationsPlacementNote)
router.post('/operations-board/match', requireAgencyAuth, canManageOperations, matchMaids)
// Agency-wide activity transcript shown on the dashboard: the workflow_events
// spine read across every entity this agency owns (placements, interviews and
// ATS applications), newest first.
router.get('/operations-board/transcript', requireAgencyAuth, canViewOperations, getOperationsTranscript)


router.get('/dashboard/authenticated', requireSupabaseAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the dashboard',
    user: req.supabaseUser,
  })
})

export default router
