import type { Request, Response } from 'express'
import { query, sql } from '../db'
import { getRequestAgencyId } from '../auth'
import { recordWorkflowEvent } from '../services/eventService'

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
    res.json({ job })
  } catch (error) { console.error('Error completing contractor job:', error); res.status(500).json({ error: 'Failed to complete contractor task' }) }
}
