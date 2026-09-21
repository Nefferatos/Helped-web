import { query, sql } from '../db'

export const startAiSession = async (input: { agencyId: number; sessionKey: string; actorType: string; actorId?: string }) => {
  const result = await query(sql`
    INSERT INTO ai_sessions (agency_id, session_key, actor_type, actor_id, started_at, last_activity_at)
    VALUES (${input.agencyId}, ${input.sessionKey}, ${input.actorType}, ${input.actorId ?? null}, NOW(), NOW())
    ON CONFLICT (agency_id, session_key) DO UPDATE SET last_activity_at = NOW()
    RETURNING id
  `)
  return String(result.rows[0]?.id ?? '')
}

export const recordAiAction = async (input: {
  sessionId?: string
  agencyId: number
  action: string
  outcome: 'allowed' | 'denied' | 'completed' | 'failed'
  capability?: string
  metadata?: Record<string, unknown>
}) => {
  await query(sql`
    INSERT INTO ai_actions (session_id, agency_id, action, capability, outcome, metadata)
    VALUES (${input.sessionId || null}::uuid, ${input.agencyId}, ${input.action}, ${input.capability ?? null}, ${input.outcome}, ${JSON.stringify(input.metadata ?? {})}::jsonb)
  `)
}
