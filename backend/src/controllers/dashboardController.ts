import { Request, Response } from 'express'
import { getWorkflowDashboard } from '../services/workflowOrchestrationService'

export const getWorkflowDashboardMetrics = async (_req: Request, res: Response) => {
  try {
    const dashboard = await getWorkflowDashboard()
    res.status(200).json(dashboard)
  } catch (error) {
    console.error('Error loading workflow dashboard:', error)
    res.status(500).json({ error: 'Failed to load dashboard metrics' })
  }
}
