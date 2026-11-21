import { createHmac, createHash, timingSafeEqual } from 'crypto'
import { getClient, query, sql } from '../db'

export type CommandStatus =
  | 'draft' | 'planning' | 'awaiting_approval' | 'approved' | 'rejected'
  | 'queued' | 'running' | 'succeeded' | 'partially_succeeded' | 'failed'
  | 'cancelled' | 'expired'

export type ExecutionStatus =
  | 'queued' | 'running' | 'succeeded' | 'partially_succeeded'
  | 'failed' | 'cancelled' | 'expired' | 'unknown'

const commandTransitions: Record<CommandStatus, CommandStatus[]> = {
  draft: ['planning', 'cancelled', 'expired'],
  planning: ['awaiting_approval', 'approved', 'failed', 'cancelled', 'expired'],
  awaiting_approval: ['approved', 'rejected', 'cancelled', 'expired'],
  approved: ['queued', 'cancelled', 'expired'],
  rejected: [], queued: ['running', 'failed', 'cancelled', 'expired'],
  running: ['succeeded', 'partially_succeeded', 'failed', 'cancelled'],
  succeeded: [], partially_succeeded: [], failed: [], cancelled: [], expired: [],
}

const executionTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
  queued: ['running', 'failed', 'cancelled', 'expired', 'unknown'],
  running: ['succeeded', 'partially_succeeded', 'failed', 'cancelled', 'unknown'],
  unknown: ['succeeded', 'partially_succeeded', 'failed'],
  succeeded: [], partially_succeeded: [], failed: [], cancelled: [], expired: [],
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

export const canonicalJson = (value: unknown) => JSON.stringify(stableValue(value))
export const hashPayload = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')

export const verifyMakeCallbackSignature = (timestamp: string, body: unknown, signature: string) => {
  const secret = process.env.AI_COMMAND_CENTER_CALLBACK_SECRET?.trim()
  if (!secret || !/^\d{10}$/.test(timestamp)) return false
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (ageSeconds > 300 || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${canonicalJson(body)}`).digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export const createCommandAction = async (input: {
  agencyId: number; actorId: string; instruction: string; agentId: string
  toolName: string; description: string; risk: string; payload: Record<string, unknown>
}) => {
  const payloadHash = hashPayload(input.payload)
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const command = await client.query(
      `INSERT INTO public.ai_commands (agency_id,actor_id,instruction,status,plan)
       VALUES ($1,$2,$3,'awaiting_approval',$4::jsonb) RETURNING id,status,created_at`,
      [input.agencyId,input.actorId,input.instruction,JSON.stringify({ summary: input.description })],
    )
    const action = await client.query(
      `INSERT INTO public.ai_command_actions
       (command_id,agency_id,agent_id,tool_name,description,status,risk_classification,payload,payload_hash)
       VALUES ($1,$2,$3,$4,$5,'awaiting_approval',$6,$7::jsonb,$8)
       RETURNING id,status,payload_hash,created_at`,
      [command.rows[0].id,input.agencyId,input.agentId,input.toolName,input.description,input.risk,JSON.stringify(input.payload),payloadHash],
    )
    await client.query('COMMIT')
    return { command: command.rows[0], action: action.rows[0] }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally { client.release() }
}

export const decideCommandAction = async (input: {
  actionId: string; agencyId: number; approverId: string; decision: 'approved' | 'rejected'
  payloadHash: string; note: string
}) => {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id,command_id,status,payload_hash FROM public.ai_command_actions
       WHERE id=$1 AND agency_id=$2 FOR UPDATE`, [input.actionId,input.agencyId],
    )
    const action = locked.rows[0]
    if (!action || action.status !== 'awaiting_approval' || action.payload_hash !== input.payloadHash) {
      await client.query('ROLLBACK')
      return null
    }
    const command = await client.query(
      `SELECT id,status FROM public.ai_commands WHERE id=$1 AND agency_id=$2 FOR UPDATE`,
      [action.command_id,input.agencyId],
    )
    if (!command.rows[0] || command.rows[0].status !== 'awaiting_approval') {
      await client.query('ROLLBACK')
      return null
    }
    const expiresAt = new Date(Date.now() + 15 * 60_000)
    await client.query(
      `INSERT INTO public.ai_approvals
       (action_id,agency_id,approver_id,decision,payload_hash,decision_note,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [input.actionId,input.agencyId,input.approverId,input.decision,input.payloadHash,input.note,expiresAt],
    )
    await client.query(
      `UPDATE public.ai_command_actions SET status=$2,updated_at=now() WHERE id=$1`,
      [input.actionId,input.decision],
    )
    await client.query(
      `UPDATE public.ai_commands SET status=$2,updated_at=now() WHERE id=$1`,
      [command.rows[0].id,input.decision],
    )
    await client.query('COMMIT')
    return { actionId: input.actionId, decision: input.decision, payloadHash: input.payloadHash, expiresAt: expiresAt.toISOString() }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally { client.release() }
}

export const acceptExecutionCallback = async (input: {
  executionId: string; actionId: string; agencyId: number; status: ExecutionStatus
  providerReference?: string; result?: Record<string, unknown>; error?: string
}) => {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id,action_id,status FROM public.ai_executions
       WHERE id=$1 AND action_id=$2 AND agency_id=$3 FOR UPDATE`,
      [input.executionId,input.actionId,input.agencyId],
    )
    const execution = locked.rows[0]
    if (!execution || !executionTransitions[execution.status as ExecutionStatus]?.includes(input.status)) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query(
      `UPDATE public.ai_executions SET status=$2,provider_reference=$3,result=$4::jsonb,
       error_detail=$5,started_at=CASE WHEN $2='running' THEN COALESCE(started_at,now()) ELSE started_at END,
       completed_at=CASE WHEN $2 IN ('succeeded','partially_succeeded','failed','cancelled','expired') THEN now() ELSE completed_at END,
       updated_at=now() WHERE id=$1`,
      [input.executionId,input.status,input.providerReference ?? null,JSON.stringify(input.result ?? {}),(input.error ?? '').slice(0,2000)],
    )
    // `unknown` is an execution-ledger state only. Keep the parent action in
    // its current state until reconciliation returns a terminal outcome.
    if (input.status !== 'unknown') {
      await client.query(
        `UPDATE public.ai_command_actions SET status=$2,updated_at=now() WHERE id=$1`,
        [input.actionId,input.status],
      )
    }
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally { client.release() }
}

export const getActionForOwnerReview = async (actionId: string, agencyId: number) => {
  const result = await query(sql`
    SELECT id, command_id, agent_id, tool_name, description, status,
      risk_classification, payload, payload_hash, created_at
    FROM public.ai_command_actions WHERE id = ${actionId} AND agency_id = ${agencyId}
  `)
  return result.rows[0] ?? null
}

export const listPendingCommandActions = async (agencyId: number) => {
  const result = await query(sql`
    SELECT a.id, a.command_id, a.agent_id, a.tool_name, a.description,
      a.status, a.risk_classification, a.payload, a.payload_hash,
      a.created_at, c.actor_id, c.instruction
    FROM public.ai_command_actions a
    JOIN public.ai_commands c ON c.id = a.command_id AND c.agency_id = a.agency_id
    WHERE a.agency_id = ${agencyId} AND a.status = 'awaiting_approval'
      AND c.status = 'awaiting_approval'
    ORDER BY a.created_at ASC
    LIMIT 100
  `)
  return result.rows
}

export const listAgencyExecutions = async (agencyId: number, limit = 50) => {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)))
  const result = await query(sql`
    SELECT id, action_id, status, provider, provider_reference,
      created_at, updated_at, started_at, completed_at,
      NULLIF(result->>'summary', '') AS summary,
      (error_detail <> '') AS has_error
    FROM public.ai_executions
    WHERE agency_id = ${agencyId}
    ORDER BY updated_at DESC, id DESC
    LIMIT ${boundedLimit}
  `)
  return result.rows
}

export const isValidCommandTransition = (from: CommandStatus, to: CommandStatus) => commandTransitions[from]?.includes(to) ?? false
