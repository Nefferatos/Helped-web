import type { Request, Response } from 'express'
import { query, sql } from '../db'
import { getRequestAgencyId } from '../auth'
import { recordWorkflowEvent } from '../services/eventService'

/** Agency-scoped task list used by the Operations Center contractor queue. */
export const listContractorJobs = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const result = await query(sql`
      SELECT j.id, j.placement_id, j.task_type, j.status, j.due_at, j.completed_at,
        j.completion_notes, j.created_at,
        json_build_object('name', c.name) AS contractors,
        json_build_object('maid_reference_code', p.maid_reference_code, 'employer_id', p.employer_id, 'status', p.status) AS placements
      FROM public.contractor_jobs j
      INNER JOIN public.contractors c ON c.id = j.contractor_id
      INNER JOIN public.placements p ON p.id = j.placement_id
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
    const jobId = String(req.params.id ?? '').trim()
    const notes = String(req.body?.notes ?? '').trim()
    const result = await query(sql`
      UPDATE public.contractor_jobs j SET status = 'COMPLETED', completed_at = NOW(), completion_notes = ${notes}, updated_at = NOW()
      FROM public.contractors c WHERE j.id = ${jobId}::uuid AND j.contractor_id = c.id AND c.agency_id = ${agencyId}
      RETURNING j.id, j.placement_id, j.task_type, j.completed_at
    `)
    const job = result.rows?.[0]
    if (!job) return res.status(404).json({ error: 'Contractor task not found' })
    if (String(job.task_type).toLowerCase().includes('arrival')) {
      void recordWorkflowEvent({ eventType: 'arrival.completed', entityType: 'placement', entityId: String(job.placement_id), actor: 'contractor', payload: { contractorJobId: job.id, notes } })
    }
    res.json({
      job,
      // The task queue uses this shape; retain `job` for the existing API.
      task: { ...job, status: 'COMPLETED', completion_notes: notes },
    })
  } catch (error) { console.error('Error completing contractor job:', error); res.status(500).json({ error: 'Failed to complete contractor task' }) }
}
