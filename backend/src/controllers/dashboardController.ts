import { Request, Response } from 'express'
import { getWorkflowDashboard } from '../services/workflowOrchestrationService'
import { query, sql } from '../db'
import { getRequestAgencyId } from '../auth'

export const getWorkflowDashboardMetrics = async (_req: Request, res: Response) => {
  try {
    const dashboard = await getWorkflowDashboard()
    res.status(200).json(dashboard)
  } catch (error) {
    console.error('Error loading workflow dashboard:', error)
    res.status(500).json({ error: 'Failed to load dashboard metrics' })
  }
}

/** Placement-centred airport/arrival operations board. */
export const getOperationsBoard = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const result = await query(sql`
      SELECT
        p.id, p.candidate_application_id, p.maid_reference_code, p.employer_id,
        p.status, p.target_start_date, p.notes, p.updated_at,
        COALESCE(h.latest_status_at, p.created_at) AS last_status_at,
        COALESCE(h.last_actor, 'system') AS last_actor,
        EXISTS (SELECT 1 FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'flight.booked') AS flight_booked,
        EXISTS (SELECT 1 FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'medical.completed') AS medical_completed,
        EXISTS (SELECT 1 FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'sip.completed') AS sip_completed,
        EXISTS (SELECT 1 FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'handover.completed') AS handover_completed
      FROM public.placements p
      LEFT JOIN LATERAL (
        SELECT to_status, actor AS last_actor, created_at AS latest_status_at
        FROM public.placement_status_history
        WHERE placement_id = p.id
        ORDER BY created_at DESC LIMIT 1
      ) h ON TRUE
      WHERE p.agency_id = ${agencyId}
      ORDER BY p.updated_at DESC
    `)
    res.json({ placements: result.rows ?? [], count: result.rows?.length ?? 0 })
  } catch (error) {
    console.error('Error loading operations board:', error)
    res.status(500).json({ error: 'Failed to load operations board' })
  }
}
