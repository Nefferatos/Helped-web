// Central event-spine writer for the operator/machine model.
//
// The website (Express + Supabase) is the OPERATOR and owns the truth.
// Make.com is the MACHINE that executes tasks. This service is the
// "black box recorder": every meaningful action — whether taken by the
// site, by Make.com, or by an AI agent — writes one row to
// public.workflow_events so we can always answer "did the machine
// actually do it?" with a SQL query instead of a guess.
//
// Design rule: recordWorkflowEvent MUST NEVER THROW. An event-log write
// must never break the business operation that triggered it. On failure
// it logs and returns null.

import { query, sql } from '../db'
import { sendToMakeWebhook } from './workflowMakeService'

export type WorkflowEventStatus = 'pending' | 'completed' | 'failed'

export type WorkflowEventInput = {
  /** Dotted action name, e.g. 'candidate.created', 'screening.completed'. */
  eventType: string
  /** Domain entity, e.g. 'application' | 'maid' | 'employer' | 'enquiry' | 'placement'. */
  entityType: string
  /** Primary key / reference of the entity (kept as TEXT to fit UUIDs and codes). */
  entityId: string
  /** Who did it: 'system' | 'make:<scenario>' | 'user:<name>' | 'ai:<agent>'. */
  actor?: string
  /** Free-form context snapshot. Keep it small and non-sensitive. */
  payload?: Record<string, unknown>
  status?: WorkflowEventStatus
}

export type WorkflowEventRecord = {
  id: string
  event_type: string
  entity_type: string
  entity_id: string
  actor: string
  payload: Record<string, unknown>
  status: WorkflowEventStatus
  created_at: string
}

const VALID_STATUSES: ReadonlySet<string> = new Set(['pending', 'completed', 'failed'])

/**
 * Event-driven dispatch table: when a given event_type is recorded, fire the
 * matching Make.com scenario. This is what turns polling scenarios into
 * event-driven ones — the moment the OPERATOR records truth, the MACHINE is
 * kicked off immediately (no 15-minute poll gap).
 *
 * The Make scenario URL is resolved by sendToMakeWebhook from
 * MAKE_WEBHOOK_URL_<SCENARIO> (falling back to MAKE_WEBHOOK_URL), exactly like
 * the rest of the codebase.
 *
 * The webhook payload is shaped like the bundle the OLD polling scenario's
 * iterator produced, so downstream Make modules can keep referencing
 * {{2.application_id}}, {{2.application_code}}, {{2.status}}, etc. unchanged.
 */
type MakeDispatch = {
  /** Make scenario key, resolved to MAKE_WEBHOOK_URL_<SCENARIO>. */
  scenario: string
  /** Build the webhook body from the event. */
  buildBody: (input: WorkflowEventInput) => Record<string, unknown>
}

const MAKE_DISPATCH: Record<string, MakeDispatch> = {
  'candidate.created': {
    scenario: 'APPLICANT_INTAKE',
    buildBody: (e) => ({
      // Top-level fields mirror the old iterator bundle (module 2).
      application_id: e.entityId,
      application_code: e.payload?.applicationCode ?? '',
      status: 'New Applicant',
      agency_id: e.payload?.agencyId ?? null,
      full_name: e.payload?.fullName ?? '',
      nationality: e.payload?.nationality ?? '',
      // Echo the trigger so Make can verify / route on it.
      event_type: e.eventType,
      actor: e.actor ?? 'system',
    }),
  },
  'arrival.completed': {
    scenario: 'CONTRACTOR_ARRIVAL_ALERT',
    buildBody: (e) => ({
      event_type: e.eventType,
      placement_id: e.entityId,
      contractor_job_id: e.payload?.contractorJobId ?? '',
      notes: e.payload?.notes ?? '',
    }),
  },
  'interview.scheduled': {
    scenario: 'INTERVIEW_SCHEDULED_ALERT',
    buildBody: (e) => ({
      event_type: e.eventType,
      interview_id: e.entityId,
      application_id: e.payload?.applicationId ?? '',
      placement_id: e.payload?.placementId ?? '',
      scheduled_at: e.payload?.scheduledAt ?? '',
    }),
  },
}

const dispatchMakeForEvent = (input: WorkflowEventInput) => {
  const dispatch = MAKE_DISPATCH[input.eventType]
  if (!dispatch) return
  // Fire-and-forget with full error isolation — a Make outage must never
  // affect the business operation or the event write.
  void sendToMakeWebhook({ scenario: dispatch.scenario, payload: dispatch.buildBody(input) })
    .then((result) => {
      if (!result.ok) {
        console.warn(`Make dispatch for ${input.eventType} failed:`, result.delivery?.error)
      }
    })
    .catch((error) => {
      console.error(`Make dispatch for ${input.eventType} threw (non-fatal):`, error)
    })
}

/**
 * Write one event row. Returns the new row id, or null if the write failed.
 * Never rejects — safe to fire-and-forget with `void recordWorkflowEvent(...)`.
 */
export const recordWorkflowEvent = async (
  input: WorkflowEventInput,
): Promise<string | null> => {
  try {
    const eventType = String(input.eventType ?? '').trim()
    const entityType = String(input.entityType ?? '').trim()
    const entityId = String(input.entityId ?? '').trim()
    if (!eventType || !entityType || !entityId) {
      console.warn('recordWorkflowEvent: missing required field, skipping', {
        eventType,
        entityType,
        entityId,
      })
      return null
    }

    const actor = String(input.actor ?? 'system').trim() || 'system'
    const status: WorkflowEventStatus = VALID_STATUSES.has(String(input.status))
      ? (input.status as WorkflowEventStatus)
      : 'completed'
    const payload =
      input.payload && typeof input.payload === 'object' ? input.payload : {}

    const result = await query(
      sql`
        INSERT INTO public.workflow_events
          (event_type, entity_type, entity_id, actor, payload, status)
        VALUES
          (${eventType}, ${entityType}, ${entityId}, ${actor}, ${JSON.stringify(payload)}::jsonb, ${status})
        RETURNING id
      `,
    )
    const row = result?.rows?.[0]
    const id = row?.id ? String(row.id) : null

    // The moment truth is recorded, kick the machine (event-driven dispatch).
    if (id) {
      dispatchMakeForEvent({ ...input, eventType, entityType, entityId, actor, payload, status })
    }

    return id
  } catch (error) {
    console.error('recordWorkflowEvent failed (non-fatal):', error)
    return null
  }
}

/**
 * Read the timeline for a single entity, newest first.
 */
export const listWorkflowEventsForEntity = async (
  entityType: string,
  entityId: string,
  limit = 100,
): Promise<WorkflowEventRecord[]> => {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100
  const result = await query(
    sql`
      SELECT id, event_type, entity_type, entity_id, actor, payload, status, created_at
      FROM public.workflow_events
      WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `,
  )
  return (result?.rows ?? []) as WorkflowEventRecord[]
}

/**
 * Health check used by the #4 exception detector:
 * entities that produced `expectedEvent` is missing for rows that emitted
 * `triggerEvent` within the window. Returns entity_ids that started but
 * never finished — i.e. silent failures.
 */
export const findMissingFollowupEvents = async (
  triggerEvent: string,
  expectedEvent: string,
  windowHours = 24,
): Promise<Array<{ entity_type: string; entity_id: string; created_at: string }>> => {
  const hours = Number.isFinite(windowHours) && windowHours > 0 ? windowHours : 24
  const result = await query(
    sql`
      SELECT t.entity_type, t.entity_id, t.created_at
      FROM public.workflow_events t
      WHERE t.event_type = ${triggerEvent}
        AND t.created_at >= NOW() - (${hours} || ' hours')::interval
        AND NOT EXISTS (
          SELECT 1 FROM public.workflow_events e
          WHERE e.event_type = ${expectedEvent}
            AND e.entity_type = t.entity_type
            AND e.entity_id = t.entity_id
            AND e.created_at >= t.created_at
        )
      ORDER BY t.created_at DESC
    `,
  )
  return (result?.rows ?? []) as Array<{
    entity_type: string
    entity_id: string
    created_at: string
  }>
}
