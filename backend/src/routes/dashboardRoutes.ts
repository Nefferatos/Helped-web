import { Router } from 'express'
import { getOperationsBoard, getWorkflowDashboardMetrics } from '../controllers/dashboardController'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth'
import { requireAgencyAuth } from '../middleware/requireAgencyAuth'

const router = Router()

router.get('/dashboard', getWorkflowDashboardMetrics)
router.get('/operations-board', requireAgencyAuth, getOperationsBoard)

router.get('/dashboard/authenticated', requireSupabaseAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the dashboard',
    user: req.supabaseUser,
  })
})

export default router

