import { Router } from 'express'
import { getWorkflowDashboardMetrics } from '../controllers/dashboardController'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth'

const router = Router()

router.get('/dashboard', getWorkflowDashboardMetrics)

router.get('/dashboard/authenticated', requireSupabaseAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the dashboard',
    user: req.supabaseUser,
  })
})

export default router

