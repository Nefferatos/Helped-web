import type { Request, Response } from 'express'
import {
  findMissingFollowupEvents,
  listWorkflowEventsForEntity,
  recordWorkflowEvent,
} from '../services/eventService'

/**
 * Shared-secret guard for machine-to-machine event ingestion (Make.com → operator).
 * The agency session middleware (requireAgencyAuth) cannot be used here because
 * Make.com holds no cookie/session; it authenticates with a static secret.
 */
const requireEventSecret = (req: Request, res: Response): boolean => {
  const expected = process.env.EVENT_INGEST_SECRET?.trim()
  if (!expected) {
    // Fail closed: if the secret is not configured, refuse ingestion entirely.
    res.status(503).json({ error: 'Event ingestion not configured' })
    return false
  }
  const provided = req.get('x-event-secret')?.trim()
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

/** POST /api/events — Make.com reports a result back to the operator. */
export const createEventController = async (req: Request, res: Response) => {
  if (!requireEventSecret(req, res)) return

  const body = (req.body ?? {}) as Record<string, unknown>
  const eventType = String(body.event_type ?? body.eventType ?? '').trim()
  const entityType = String(body.entity_type ?? body.entityType ?? '').trim()
  const entityId = String(body.entity_id ?? body.entityId ?? '').trim()

  if (!eventType || !entityType || !entityId) {
    return res.status(400).json({
      error: 'event_type, entity_type and entity_id are required',
    })
  }

  const id = await recordWorkflowEvent({
    eventType,
    entityType,
    entityId,
    actor: String(body.actor ?? 'make:unknown'),
    payload:
      body.payload && typeof body.payload === 'object'
        ? (body.payload as Record<string, unknown>)
        : {},
    status: (body.status as 'pending' | 'completed' | 'failed') ?? 'completed',
  })

  if (!id) {
    return res.status(500).json({ error: 'Failed to record event' })
  }
  return res.status(201).json({ id, recorded: true })
}

/** GET /api/events?entityType=&entityId= — timeline reads (agency-authed). */
export const listEventsController = async (req: Request, res: Response) => {
  const entityType = String(req.query.entityType ?? '').trim()
  const entityId = String(req.query.entityId ?? '').trim()
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType and entityId are required' })
  }
  const limit = Number(req.query.limit ?? 100)
  const events = await listWorkflowEventsForEntity(entityType, entityId, limit)
  return res.json({ events, count: events.length })
}

/**
 * GET /api/events/health?triggerEvent=&expectedEvent=&windowHours=
 * Entities that emitted triggerEvent but never emitted expectedEvent.
 * This is the "silent failure" detector.
 */
export const eventHealthController = async (req: Request, res: Response) => {
  if (!requireEventSecret(req, res)) return

  const triggerEvent = String(req.query.triggerEvent ?? '').trim()
  const expectedEvent = String(req.query.expectedEvent ?? '').trim()
  if (!triggerEvent || !expectedEvent) {
    return res
      .status(400)
      .json({ error: 'triggerEvent and expectedEvent are required' })
  }
  const windowHours = Number(req.query.windowHours ?? 24)
  const missing = await findMissingFollowupEvents(
    triggerEvent,
    expectedEvent,
    windowHours,
  )
  return res.json({
    triggerEvent,
    expectedEvent,
    windowHours,
    missingCount: missing.length,
    missing,
  })
}
