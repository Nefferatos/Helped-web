import { Request, Response } from 'express'
import { getWorkflowDashboard } from '../services/workflowOrchestrationService'
import { getClient, query, sql } from '../db'
import { getAuthenticatedAgencyAdmin, getRequestAgencyId } from '../auth'
import { getMaidsStore } from '../store'
import { getEmployerRequirements } from '../services/employerRequirementsService'

export const getWorkflowDashboardMetrics = async (_req: Request, res: Response) => {
  try {
    const dashboard = await getWorkflowDashboard()
    res.status(200).json(dashboard)
  } catch (error) {
    console.error('Error loading workflow dashboard:', error)
    res.status(500).json({ error: 'Failed to load dashboard metrics' })
  }
}

/** Sanitized Make setup status for the agency dashboard. A webhook URL only
 * proves configuration, not that the scenario is switched on in Make. */
export const getAutomationMonitor = async (_req: Request, res: Response) => {
  const workflowDefinitions: Array<{ id: string; name: string; env: string; fallbackEnv?: string[]; mode: string; purpose: string; trigger: string }> = [
    { id: 'applicant-intake', name: 'Applicant Intake & Screening', env: 'MAKE_WEBHOOK_URL_APPLICANT_INTAKE', mode: 'automatic', purpose: 'Receives and screens new public maid applications.', trigger: 'A public maid application is submitted.' },
    { id: 'placement-alerts', name: 'Placement Milestone Alerts', env: 'MAKE_WEBHOOK_URL_PLACEMENT_MILESTONE_ALERT', mode: 'automatic', purpose: 'Notifies staff when placement milestones are recorded.', trigger: 'A flight, medical, SIP, or handover milestone is completed.' },
    { id: 'interview-alerts', name: 'Interview Scheduling Alerts', env: 'MAKE_WEBHOOK_URL_INTERVIEW_SCHEDULED_ALERT', mode: 'automatic', purpose: 'Sends interview scheduling notifications.', trigger: 'An interview is scheduled.' },
    { id: 'arrival-alerts', name: 'Contractor Arrival Alerts', env: 'MAKE_WEBHOOK_URL_CONTRACTOR_ARRIVAL_ALERT', mode: 'automatic', purpose: 'Notifies staff when an arrival task is completed.', trigger: 'A contractor arrival task is completed.' },
    { id: 'whatsapp-broadcast', name: 'WhatsApp Broadcast', env: 'MAKE_WHATSAPP_BROADCAST_WEBHOOK_URL', mode: 'staff initiated', purpose: 'Forwards an approved contact list and message for broadcast.', trigger: 'Staff confirms a broadcast.' },
    { id: 'ai-command-center', name: 'AI Command Center', env: 'MAKE_AI_COMMAND_CENTER_WEBHOOK_URL', fallbackEnv: ['MAKE_AI_ENGINE_WEBHOOK_URL'], mode: 'staff initiated', purpose: 'Generates AI assistant replies with agency context.', trigger: 'Staff sends a message in the command center.' },
    { id: 'ai-receptionist', name: 'AI Receptionist', env: 'MAKE_AI_RECEPTIONIST_WEBHOOK_URL', mode: 'visitor initiated', purpose: 'Routes public receptionist conversations to the AI scenario.', trigger: 'A visitor sends a receptionist message.' },
    { id: 'fdw-application-chat', name: 'FDW Application Chat & Referral', env: 'MAKE_WEBHOOK_URL_FDW_CHATBOT', mode: 'visitor initiated', purpose: 'Handles the FDW application chat and referral flow.', trigger: 'A visitor uses FDW application chat or referral.' },
    { id: 'maid-referral', name: 'Maid Referral', env: 'MAKE_WEBHOOK_URL_MAID_REFERRAL', mode: 'visitor initiated', purpose: 'Forwards submitted maid referrals to the configured workflow.', trigger: 'A user submits a maid referral.' },
    { id: 'pdf-biodata', name: 'PDF Biodata Autofill', env: 'MAKE_PDF_AUTOFILL_WEBHOOK_URL', mode: 'staff initiated', purpose: 'Sends an uploaded biodata PDF for data extraction.', trigger: 'Staff requests PDF autofill.' },
    { id: 'hr-email', name: 'HR Interview Email Notifications', env: 'MAKE_HR_EMAIL_WEBHOOK_URL', fallbackEnv: ['MAKE_WEBHOOK_URL'], mode: 'staff initiated', purpose: 'Sends HR interview email requests through Make.', trigger: 'Staff requests an HR interview email.' },
    { id: 'website-ai-workflow', name: 'Website AI Workflow', env: 'MAKE_WEBHOOK_URL', fallbackEnv: ['MAKE_WEBHOOK_URL_INQUIRY_PIPELINE', 'MAKE_WEBHOOK_URL_LEAD_PIPELINE', 'MAKE_WEBHOOK_URL_INTERVIEW_PIPELINE', 'MAKE_HR_EMAIL_WEBHOOK_URL'], mode: 'automatic and staff initiated', purpose: 'Routes website inquiries and leads, HR interview email and calendar actions, and applicant interview completion events.', trigger: 'An inquiry or lead is submitted, an interview action is requested, or an applicant interview is completed.' },
  ]
  const workflows = workflowDefinitions.map(({ env, fallbackEnv, ...workflow }) => ({ ...workflow, configured: Boolean(process.env[env]?.trim() || fallbackEnv?.some((name) => process.env[name]?.trim())), scenarioStatus: 'unknown' }))
  res.json({ checkedAt: new Date().toISOString(), workflows })
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
        EXISTS (SELECT 1 FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'handover.completed') AS handover_completed,
        jsonb_build_object(
          'flight', (SELECT jsonb_build_object('actor', e.actor, 'notes', e.payload ->> 'notes', 'completedAt', e.created_at) FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'flight.booked' ORDER BY e.created_at DESC LIMIT 1),
          'medical', (SELECT jsonb_build_object('actor', e.actor, 'notes', e.payload ->> 'notes', 'completedAt', e.created_at) FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'medical.completed' ORDER BY e.created_at DESC LIMIT 1),
          'sip', (SELECT jsonb_build_object('actor', e.actor, 'notes', e.payload ->> 'notes', 'completedAt', e.created_at) FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'sip.completed' ORDER BY e.created_at DESC LIMIT 1),
          'handover', (SELECT jsonb_build_object('actor', e.actor, 'notes', e.payload ->> 'notes', 'completedAt', e.created_at) FROM public.workflow_events e WHERE e.entity_type = 'placement' AND e.entity_id = p.id::text AND e.event_type = 'handover.completed' ORDER BY e.created_at DESC LIMIT 1)
        ) AS milestone_events
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

/** Create a placement only after staff confirms the employer chose a helper. */
export const createOperationsPlacement = async (req: Request, res: Response) => {
    const maidId = Number(req.body?.maidId)
    const employerId = Number(req.body?.employerId)
    if (!Number.isInteger(maidId) || maidId <= 0) {
      return res.status(400).json({ error: 'Choose a valid helper profile' })
    }

    if (!Number.isInteger(employerId) || employerId <= 0) {
      return res.status(400).json({ error: 'Enter a valid employer number' })
    }

    try {
      const agencyId = await getRequestAgencyId(req)
      const admin = await getAuthenticatedAgencyAdmin(req)
      const maid = (await getMaidsStore(undefined, 'public', agencyId)).find(
        (item) => item.id === maidId && !/inactive|archived|rejected|blacklist/i.test(item.status ?? ''),
      )
      if (!maid) return res.status(404).json({ error: 'The selected helper is no longer available in this agency' })

      const requirements = await getEmployerRequirements(agencyId, employerId)
      if (!requirements) {
        return res.status(409).json({ error: 'Save this employer’s needs before starting a placement' })
      }

      const client = await getClient()
      try {
        await client.query('BEGIN')
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `${agencyId}:${employerId}:${maid.referenceCode}`,
        ])

        const existing = await client.query(
          `SELECT id FROM public.placements
           WHERE agency_id = $1 AND employer_id = $2 AND maid_reference_code = $3
             AND status NOT IN ('COMPLETED', 'CANCELLED', 'WITHDRAWN')
           LIMIT 1`,
          [agencyId, String(employerId), maid.referenceCode],
        )
        if (existing.rows[0]) {
          await client.query('ROLLBACK')
          return res.status(409).json({ error: 'A placement for this employer and helper already exists' })
        }

        const placementResult = await client.query(
          `INSERT INTO public.placements (agency_id, maid_reference_code, employer_id, status, notes)
           VALUES ($1, $2, $3, 'CANDIDATE_SELECTED', $4)
           RETURNING id, maid_reference_code, employer_id, status, created_at`,
          [
            agencyId,
            maid.referenceCode,
            String(employerId),
            `Started from employer matching by ${admin?.username?.trim() || 'agency staff'}`,
          ],
        )
        const placement = placementResult.rows[0]
        const actor = admin?.username?.trim() || admin?.email?.trim() || 'Agency staff'
        await client.query(
          `INSERT INTO public.placement_status_history (placement_id, to_status, actor, reason, metadata)
           VALUES ($1, 'CANDIDATE_SELECTED', $2, 'Employer confirmed helper selection', $3::jsonb)`,
          [placement.id, actor, JSON.stringify({ employerId, maidReferenceCode: maid.referenceCode })],
        )
        await client.query('COMMIT')
        return res.status(201).json({ placement })
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined)
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error starting operations placement:', error)
      return res.status(500).json({ error: 'Unable to start placement steps' })
  }
}

export const saveOperationsPlacementNote = async (req: Request, res: Response) => {
  const placementId = String(req.params.placementId ?? '').trim()
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : null
  if (notes === null) return res.status(400).json({ error: 'Enter a valid staff note' })
  if (notes.length > 2000) return res.status(400).json({ error: 'Staff notes must be 2,000 characters or fewer' })

  try {
    const agencyId = await getRequestAgencyId(req)
    const result = await query(sql`
      UPDATE public.placements
      SET notes = ${notes}, updated_at = NOW()
      WHERE id = ${placementId}::uuid AND agency_id = ${agencyId}
      RETURNING id, notes
    `)
    const placement = result.rows?.[0]
    if (!placement) return res.status(404).json({ error: 'Placement not found' })
    return res.json({ placement })
  } catch (error) {
    console.error('Error saving Operations Center placement note:', error)
    return res.status(500).json({ error: 'Unable to save staff note' })
  }
}

/**
 * Agency-wide activity transcript.
 *
 * public.workflow_events is keyed by (entity_type, entity_id) and carries no
 * agency column, so every event is attributed to the agency through the entity
 * it belongs to:
 *   • placement   → public.placements.agency_id
 *   • interview   → public.interviews.agency_id
 *   • application → the writer stores agencyId inside the event payload
 * Anything that cannot be attributed is dropped rather than returned, because
 * this endpoint is agency-authenticated.
 */
export const getOperationsTranscript = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const requested = Number(req.query.limit ?? 200)
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), 500)
      : 200

    const result = await query(sql`
      SELECT
        e.id,
        e.event_type,
        e.entity_type,
        e.entity_id,
        e.actor,
        e.payload,
        e.status,
        e.created_at,
        p.maid_reference_code AS placement_reference,
        i.application_id AS interview_application_id
      FROM public.workflow_events e
      LEFT JOIN public.placements p
        ON e.entity_type = 'placement' AND p.id::text = e.entity_id
      LEFT JOIN public.interviews i
        ON e.entity_type = 'interview' AND i.id::text = e.entity_id
      WHERE (e.entity_type = 'placement' AND p.agency_id = ${agencyId})
         OR (e.entity_type = 'interview' AND i.agency_id = ${agencyId})
         OR (e.entity_type = 'application' AND e.payload->>'agencyId' = ${String(agencyId)})
      ORDER BY e.created_at DESC
      LIMIT ${limit}
    `)

    const entries = result.rows ?? []
    return res.json({ entries, count: entries.length, limit })
  } catch (error) {
    console.error('Error loading operations transcript:', error)
    return res.status(500).json({ error: 'Failed to load the activity transcript' })
  }
}

