import type { Request, Response } from 'express'
import { getRequestToken } from '../auth'
import { createCommandAction, decideCommandAction, getActionForOwnerReview, listPendingCommandActions, listAgencyExecutions, verifyMakeCallbackSignature, acceptExecutionCallback } from '../services/aiCommandCenterSecurityService'
import { getAgencyAdminByTokenRecord } from '../repositories/agencyAdminRepository'

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const getFreshCommandCenterOwner = async (req: Request) => {
  const token = getRequestToken(req)
  return token ? await getAgencyAdminByTokenRecord(token).catch(() => null) : null
}

const isConfiguredCommandCenterOwner = (admin: NonNullable<Awaited<ReturnType<typeof getFreshCommandCenterOwner>>>) =>
  admin.username.trim().toLowerCase() === 'attheagency'

export const prepareAction = async (req: Request, res: Response) => {
  const instruction = text(req.body?.instruction, 4000)
  const agentId = text(req.body?.agentId, 80)
  const toolName = text(req.body?.toolName, 100)
  const description = text(req.body?.description, 1000)
  const payload = req.body?.payload
  const risk = text(req.body?.riskClassification, 20) || 'high'
  if (!instruction || !agentId || !toolName || !description || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Invalid action proposal' })
  }
  if (!['low','moderate','high','critical'].includes(risk)) return res.status(400).json({ error: 'Invalid risk classification' })
  try {
    const admin = req.admin!
    const result = await createCommandAction({ agencyId: admin.agencyId, actorId: String(admin.id), instruction, agentId, toolName, description, risk, payload })
    return res.status(201).json(result)
  } catch (error) {
    console.error('[ai-command-center] proposal failed', error instanceof Error ? error.message : 'unknown')
    return res.status(503).json({ error: 'Command Center storage unavailable; confirm the foundation migration is applied' })
  }
}

export const reviewAction = async (req: Request, res: Response) => {
  if (!UUID.test(req.params.actionId)) return res.status(400).json({ error: 'Invalid action ID' })
  const freshAdmin = await getFreshCommandCenterOwner(req)
  if (!freshAdmin) return res.status(503).json({ error: 'Could not freshly verify the owner session' })
  if (!isConfiguredCommandCenterOwner(freshAdmin)) {
    return res.status(403).json({ error: 'This account is not configured as a Command Center owner' })
  }
  const decision = req.body?.decision
  const payloadHash = text(req.body?.payloadHash, 64)
  const note = text(req.body?.note ?? '', 1000) ?? ''
  if (!['approved','rejected'].includes(decision) || !payloadHash || !/^[a-f0-9]{64}$/.test(payloadHash)) {
    return res.status(400).json({ error: 'A valid decision and payload hash are required' })
  }
  try {
    const agencyId = freshAdmin.agencyId
    const action = await getActionForOwnerReview(req.params.actionId, agencyId)
    if (!action) return res.status(404).json({ error: 'Action not found' })
    const result = await decideCommandAction({ actionId: action.id, agencyId, approverId: String(freshAdmin.id), decision, payloadHash, note })
    if (!result) return res.status(409).json({ error: 'Action changed, already reviewed, or payload hash does not match' })
    return res.json(result)
  } catch (error) {
    console.error('[ai-command-center] review failed', error instanceof Error ? error.message : 'unknown')
    return res.status(503).json({ error: 'Approval storage unavailable; confirm the foundation migration is applied' })
  }
}

export const pendingActions = async (req: Request, res: Response) => {
  const freshAdmin = await getFreshCommandCenterOwner(req)
  if (!freshAdmin) return res.status(503).json({ error: 'Could not freshly verify the owner session' })
  if (!isConfiguredCommandCenterOwner(freshAdmin)) return res.status(403).json({ error: 'This account is not configured as a Command Center owner' })
  try {
    const actions = await listPendingCommandActions(freshAdmin.agencyId)
    return res.json({ actions })
  } catch (error) {
    console.error('[ai-command-center] pending action list failed', error instanceof Error ? error.message : 'unknown')
    return res.status(503).json({ error: 'Approval queue unavailable; confirm the foundation migration is applied' })
  }
}

const sendExecutionEvent = (res: Response, event: string, data: unknown) => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export const getExecutions = async (req: Request, res: Response) => {
  const freshAdmin = await getFreshCommandCenterOwner(req)
  if (!freshAdmin) return res.status(503).json({ error: 'Could not freshly verify the owner session' })
  if (!isConfiguredCommandCenterOwner(freshAdmin)) return res.status(403).json({ error: 'This account is not configured as a Command Center owner' })
  const requestedLimit = Number(req.query.limit ?? 50)
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50
  try {
    return res.json({ executions: await listAgencyExecutions(freshAdmin.agencyId, limit) })
  } catch (error) {
    console.error('[ai-command-center] execution snapshot failed', error instanceof Error ? error.message : 'unknown')
    return res.status(503).json({ error: 'Execution monitor unavailable; confirm the foundation migration is applied' })
  }
}

export const streamExecutions = async (req: Request, res: Response) => {
  const freshAdmin = await getFreshCommandCenterOwner(req)
  if (!freshAdmin) return res.status(503).json({ error: 'Could not freshly verify the owner session' })
  if (!isConfiguredCommandCenterOwner(freshAdmin)) return res.status(403).json({ error: 'This account is not configured as a Command Center owner' })

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  ;(res as Response & { flushHeaders?: () => void }).flushHeaders?.()

  let closed = false
  let polling = false
  let previousSnapshot = ''
  const startedAt = Date.now()
  let lastOwnerVerification = startedAt
  const sendSnapshot = async () => {
    if (closed || polling) return
    polling = true
    try {
      if (Date.now() - lastOwnerVerification >= 30_000) {
        const currentAdmin = await getFreshCommandCenterOwner(req)
        if (!currentAdmin || !isConfiguredCommandCenterOwner(currentAdmin) || currentAdmin.agencyId !== freshAdmin.agencyId) {
          sendExecutionEvent(res, 'authorization_expired', { error: 'Owner access changed; reconnect to continue monitoring' })
          res.end()
          cleanup()
          return
        }
        lastOwnerVerification = Date.now()
      }
      const executions = await listAgencyExecutions(freshAdmin.agencyId, 50)
      const serialized = JSON.stringify(executions)
      if (serialized !== previousSnapshot) {
        sendExecutionEvent(res, 'snapshot', { executions, generatedAt: new Date().toISOString() })
        previousSnapshot = serialized
      }
    } catch {
      if (!closed) {
        try { sendExecutionEvent(res, 'monitor_error', { error: 'Execution updates are temporarily unavailable' }) }
        catch { cleanup() }
      }
    } finally {
      polling = false
    }
  }

  const pollTimer = setInterval(() => { void sendSnapshot() }, 5_000)
  const heartbeatTimer = setInterval(() => {
    if (!closed) res.write(': heartbeat\n\n')
  }, 25_000)
  const maxAgeTimer = setTimeout(() => {
    if (!closed) sendExecutionEvent(res, 'reconnect', { retryAfterMs: 1_000 })
    res.end()
  }, 5 * 60_000)
  const cleanup = () => {
    if (closed) return
    closed = true
    clearInterval(pollTimer)
    clearInterval(heartbeatTimer)
    clearTimeout(maxAgeTimer)
  }
  res.on('close', cleanup)
  await sendSnapshot()
}

export const makeExecutionCallback = async (req: Request, res: Response) => {
  const timestamp = String(req.header('x-ata-timestamp') ?? '')
  const signature = String(req.header('x-ata-signature') ?? '')
  if (!verifyMakeCallbackSignature(timestamp, req.body, signature)) return res.status(401).json({ error: 'Invalid callback signature' })
  const { executionId, actionId, agencyId, status } = req.body ?? {}
  if (!UUID.test(String(executionId)) || !UUID.test(String(actionId)) || !Number.isInteger(agencyId) || !['running','succeeded','partially_succeeded','failed','cancelled','expired','unknown'].includes(status)) {
    return res.status(400).json({ error: 'Invalid callback payload' })
  }
  try {
    const accepted = await acceptExecutionCallback({
      executionId, actionId, agencyId, status,
      providerReference: text(req.body.providerReference, 200) ?? undefined,
      result: req.body.result && typeof req.body.result === 'object' && !Array.isArray(req.body.result) ? req.body.result : {},
      error: text(req.body.error, 2000) ?? '',
    })
    return accepted ? res.status(200).json({ ok: true }) : res.status(409).json({ error: 'Unknown execution or invalid state transition' })
  } catch (error) {
    console.error('[ai-command-center] callback failed', error instanceof Error ? error.message : 'unknown')
    return res.status(503).json({ error: 'Execution ledger unavailable' })
  }
}
