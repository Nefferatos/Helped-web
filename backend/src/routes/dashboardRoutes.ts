import { Router } from 'express'
import { createOperationsPlacement, getOperationsBoard, getWorkflowDashboardMetrics, saveOperationsPlacementNote } from '../controllers/dashboardController'
import { matchMaids } from '../controllers/matchController'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router = Router()

router.get('/dashboard', getWorkflowDashboardMetrics)
router.get('/operations-board', requireAgencyAuth, getOperationsBoard)
router.post('/operations-board/placements', requireAgencyAuth, createOperationsPlacement)
router.put('/operations-board/placements/:placementId/notes', requireAgencyAuth, saveOperationsPlacementNote)
router.post('/operations-board/match', requireAgencyAuth, matchMaids)

router.get('/dashboard/authenticated', requireSupabaseAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the dashboard',
    user: req.supabaseUser,
  })
})

export default router
