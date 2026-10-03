import type { Request, Response } from 'express'
import { query, sql } from '../db'
import { getAuthenticatedAgencyAdmin, getRequestAgencyId } from '../auth'
import { recordWorkflowEvent } from '../services/eventService'

/** Agency-scoped task list used by the Operations Center contractor queue. */
export const listContractorJobs = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const result = await query(sql`
      SELECT j.id, j.placement_id, j.task_type, j.status, j.due_at, j.completed_at,
        j.completion_notes, j.created_at,
        completion_event.actor AS completed_by,
        json_build_object('name', c.name) AS contractors,
        json_build_object('maid_reference_code', p.maid_reference_code, 'employer_id', p.employer_id, 'status', p.status) AS placements
      FROM public.contractor_jobs j
      INNER JOIN public.contractors c ON c.id = j.contractor_id
      INNER JOIN public.placements p ON p.id = j.placement_id
      LEFT JOIN LATERAL (
        SELECT e.actor
        FROM public.workflow_events e
        WHERE e.entity_type = 'placement'
          AND e.entity_id = j.placement_id::text
          AND e.payload ->> 'contractorJobId' = j.id::text
        ORDER BY e.created_at DESC
        LIMIT 1
      ) completion_event ON TRUE
      WHERE c.agency_id = ${agencyId}
      ORDER BY j.due_at ASC NULLS LAST, j.created_at DESC
      LIMIT 200
    `)
    const tasks = result.rows ?? []
    res.json({ tasks, count: tasks.length })
  } catch (error) {
    console.error('Error loading contractor tasks:', error)
    res.status(500).json({ error: 'Unable to load contractor tasks' })
  }
}

export const completeContractorJob = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const admin = await getAuthenticatedAgencyAdmin(req)
    const completedBy = admin?.username?.trim() || admin?.email?.trim() || 'Agency Staff'
    const jobId = String(req.params.id ?? '').trim()
    const notes = String(req.body?.notes ?? '').trim()
    const result = await query(sql`
      UPDATE public.contractor_jobs j SET status = 'COMPLETED', completed_at = NOW(), completion_notes = ${notes}, updated_at = NOW()
      FROM public.contractors c WHERE j.id = ${jobId}::uuid AND j.contractor_id = c.id AND c.agency_id = ${agencyId} AND j.status <> 'COMPLETED'
      RETURNING j.id, j.placement_id, j.task_type, j.completed_at
    `)
    const job = result.rows?.[0]
    if (!job) return res.status(404).json({ error: 'Contractor task not found' })
    const taskType = String(job.task_type).toLowerCase()
    const eventType = taskType.includes('flight')
      ? 'flight.booked'
      : taskType.includes('medical')
        ? 'medical.completed'
        : taskType.includes('handover')
          ? 'handover.completed'
          : taskType.includes('sip')
            ? 'sip.completed'
            : 'arrival.completed'
    await recordWorkflowEvent({
      eventType,
      entityType: 'placement',
      entityId: String(job.placement_id),
      actor: `user:${completedBy}`,
      payload: { contractorJobId: job.id, taskType: job.task_type, notes, completedBy },
    })
    res.json({
      job,
      // The task queue uses this shape; retain `job` for the existing API.
      task: { ...job, status: 'COMPLETED', completion_notes: notes, completed_by: completedBy },
    })
  } catch (error) { console.error('Error completing contractor job:', error); res.status(500).json({ error: 'Failed to complete contractor task' }) }
}

/** Lets agency staff update a placement even when no contractor_jobs were generated. */
export const completePlacementMilestone = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const admin = await getAuthenticatedAgencyAdmin(req)
    const placementId = String(req.params.placementId ?? '').trim()
    const milestone = String(req.params.milestone ?? '').trim().toLowerCase()
    const notes = String(req.body?.notes ?? '').trim()
    const eventTypeByMilestone: Record<string, string> = {
      flight: 'flight.booked', medical: 'medical.completed', sip: 'sip.completed', handover: 'handover.completed',
    }
    const eventType = eventTypeByMilestone[milestone]
    if (!eventType) return res.status(400).json({ error: 'Unsupported placement milestone' })

    const placement = await query(sql`SELECT id FROM public.placements WHERE id = ${placementId}::uuid AND agency_id = ${agencyId} LIMIT 1`)
    if (!placement.rows?.[0]) return res.status(404).json({ error: 'Placement not found' })

    const existing = await query(sql`
      SELECT id FROM public.workflow_events
      WHERE entity_type = 'placement' AND entity_id = ${placementId} AND event_type = ${eventType}
      LIMIT 1
    `)
    if (existing.rows?.[0]) return res.status(409).json({ error: 'This placement milestone has already been completed' })

    const completedBy = admin?.username?.trim() || admin?.email?.trim() || 'Agency Staff'
    await recordWorkflowEvent({ eventType, entityType: 'placement', entityId: placementId, actor: `user:${completedBy}`, payload: { notes, completedBy, source: 'agency-portal' } })
    res.json({ ok: true, eventType, completedBy, completedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Error completing placement milestone:', error)
    res.status(500).json({ error: 'Unable to update placement milestone' })
  }
}
