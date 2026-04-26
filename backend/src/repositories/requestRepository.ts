import { getClient, query } from '../db'

export type SqlRequestStatus = 'pending' | 'interested' | 'direct_hire' | 'rejected'
export type SqlRequestType = 'general' | 'direct'
export type SqlSenderType = 'client' | 'admin' | 'staff' | 'system'

export interface SqlRequestRecord {
  id: string
  clientId: number
  agencyId: number
  type: SqlRequestType
  status: SqlRequestStatus
  details: Record<string, unknown>
  maidReferences: string[]
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface SqlConversationRecord {
  id: string
  requestId: string
  agencyId: number
  clientId: number
  createdAt: string
}

export interface SqlMessageRecord {
  id: string
  conversationId: string
  senderType: SqlSenderType
  senderId: number
  message: string
  attachments?: unknown
  createdAt: string
}

export interface SqlRequestMetrics {
  total: number
  pending: number
  interested: number
  directHire: number
  rejected: number
}

type RequestRow = {
  id: string
  client_id: number
  agency_id: number
  type: SqlRequestType
  status: SqlRequestStatus
  details: Record<string, unknown> | null
  maid_references: string[] | null
  updated_by: string
  created_at: Date | string
  updated_at: Date | string
}

type ConversationRow = {
  id: string
  request_id: string
  agency_id: number
  client_id: number
  created_at: Date | string
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_type: SqlSenderType
  sender_id: number
  message: string
  attachments?: unknown
  created_at: Date | string
}

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const mapRequestRow = (row: RequestRow): SqlRequestRecord => ({
  id: row.id,
  clientId: Number(row.client_id),
  agencyId: Number(row.agency_id ?? 1),
  type: row.type === 'direct' ? 'direct' : 'general',
  status:
    row.status === 'interested' ||
    row.status === 'direct_hire' ||
    row.status === 'rejected'
      ? row.status
      : 'pending',
  details: row.details && typeof row.details === 'object' ? row.details : {},
  maidReferences: Array.isArray(row.maid_references) ? row.maid_references : [],
  updatedBy: String(row.updated_by || 'system'),
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
})

const mapConversationRow = (row: ConversationRow): SqlConversationRecord => ({
  id: row.id,
  requestId: row.request_id,
  agencyId: Number(row.agency_id),
  clientId: Number(row.client_id),
  createdAt: toIsoString(row.created_at),
})

const mapMessageRow = (row: MessageRow): SqlMessageRecord => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderType: row.sender_type,
  senderId: Number(row.sender_id),
  message: row.message,
  createdAt: toIsoString(row.created_at),
  ...(row.attachments !== undefined ? { attachments: row.attachments } : {}),
})

export const createRequestRecord = async (payload: {
  clientId: number
  agencyId: number
  type: SqlRequestType
  details: Record<string, unknown>
  maidReferences: string[]
  updatedBy: string
}) => {
  const dbClient = await getClient()

  try {
    await dbClient.query('BEGIN')

    const requestResult = await dbClient.query<RequestRow>(
      `
        INSERT INTO requests (
          client_id,
          agency_id,
          type,
          status,
          details,
          maid_references,
          updated_by
        )
        VALUES ($1, $2, $3, 'pending', $4::jsonb, $5::text[], $6)
        RETURNING *
      `,
      [
        payload.clientId,
        payload.agencyId,
        payload.type,
        JSON.stringify(payload.details ?? {}),
        payload.maidReferences,
        payload.updatedBy,
      ]
    )

    const requestRow = requestResult.rows[0]

    const conversationResult = await dbClient.query<ConversationRow>(
      `
        INSERT INTO conversations (request_id, agency_id, client_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [requestRow.id, requestRow.agency_id, requestRow.client_id]
    )

    await dbClient.query<MessageRow>(
      `
        INSERT INTO messages (conversation_id, sender_type, sender_id, message)
        VALUES ($1, 'system', 0, $2)
      `,
      [conversationResult.rows[0].id, 'New request created']
    )

    await dbClient.query('COMMIT')

    return {
      request: mapRequestRow(requestRow),
      conversation: mapConversationRow(conversationResult.rows[0]),
    }
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  } finally {
    dbClient.release()
  }
}

export const listRequestRecords = async (filters: {
  agencyId?: number
  clientId?: number
  status?: SqlRequestStatus
  query?: string
  page: number
  pageSize: number
}) => {
  const conditions: string[] = []
  const values: unknown[] = []

  if (typeof filters.agencyId === 'number') {
    values.push(filters.agencyId)
    conditions.push(`COALESCE(agency_id, 1) = $${values.length}`)
  }
  if (typeof filters.clientId === 'number') {
    values.push(filters.clientId)
    conditions.push(`client_id = $${values.length}`)
  }
  if (filters.status) {
    values.push(filters.status)
    conditions.push(`status = $${values.length}`)
  }
  if (filters.query?.trim()) {
    values.push(`%${filters.query.trim().toLowerCase()}%`)
    conditions.push(
      `(LOWER(type) LIKE $${values.length} OR LOWER(status) LIKE $${values.length} OR LOWER(COALESCE(details::text, '')) LIKE $${values.length} OR EXISTS (SELECT 1 FROM unnest(maid_references) AS maid_ref WHERE LOWER(maid_ref) LIKE $${values.length}))`
    )
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM requests ${whereClause}`,
    values
  ) as { rows: Array<{ total: number }> }
  const total = Number(countResult.rows[0]?.total ?? 0)

  values.push(filters.pageSize)
  values.push((filters.page - 1) * filters.pageSize)

  const dataResult = (await query(
    `
      SELECT *
      FROM requests
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  )) as { rows: RequestRow[] }

  return {
    items: dataResult.rows.map(mapRequestRow),
    total,
  }
}

export const getRequestRecordById = async (id: string) => {
  const result = (await query(
    `SELECT * FROM requests WHERE id = $1 LIMIT 1`,
    [id]
  )) as { rows: RequestRow[] }
  return result.rows[0] ? mapRequestRow(result.rows[0]) : null
}

export const getRequestMetricsByAgencyId = async (
  agencyId: number
): Promise<SqlRequestMetrics> => {
  const result = (await query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'interested')::int AS interested,
        COUNT(*) FILTER (WHERE status = 'direct_hire')::int AS direct_hire,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM requests
      WHERE COALESCE(agency_id, 1) = $1
    `,
    [agencyId]
  )) as {
    rows: Array<{
      total: number
      pending: number
      interested: number
      direct_hire: number
      rejected: number
    }>
  }

  const row = result.rows[0]

  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    interested: Number(row?.interested ?? 0),
    directHire: Number(row?.direct_hire ?? 0),
    rejected: Number(row?.rejected ?? 0),
  }
}

export const updateRequestStatusRecord = async (
  id: string,
  agencyId: number,
  status: SqlRequestStatus,
  updatedBy: string
) => {
  const result = (await query(
    `
      UPDATE requests
      SET status = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND COALESCE(agency_id, 1) = $2
      RETURNING *
    `,
    [id, agencyId, status, updatedBy]
  )) as { rows: RequestRow[] }
  return result.rows[0] ? mapRequestRow(result.rows[0]) : null
}

export const updateRequestMaidsRecord = async (
  id: string,
  agencyId: number,
  maidReferences: string[],
  updatedBy: string
) => {
  const normalizedReferences = maidReferences.filter((item) => item.trim().length > 0)
  const type: SqlRequestType = normalizedReferences.length > 0 ? 'direct' : 'general'

  const result = (await query(
    `
      UPDATE requests
      SET maid_references = $3::text[],
          type = $4,
          updated_by = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND COALESCE(agency_id, 1) = $2
      RETURNING *
    `,
    [id, agencyId, normalizedReferences, type, updatedBy]
  )) as { rows: RequestRow[] }
  return result.rows[0] ? mapRequestRow(result.rows[0]) : null
}

export const getConversationByRequestId = async (requestId: string) => {
  const result = (await query(
    `SELECT * FROM conversations WHERE request_id = $1 LIMIT 1`,
    [requestId]
  )) as { rows: ConversationRow[] }
  return result.rows[0] ? mapConversationRow(result.rows[0]) : null
}

export const getConversationById = async (conversationId: string) => {
  const result = (await query(
    `SELECT * FROM conversations WHERE id = $1 LIMIT 1`,
    [conversationId]
  )) as { rows: ConversationRow[] }
  return result.rows[0] ? mapConversationRow(result.rows[0]) : null
}

export const getMessagesByConversationId = async (conversationId: string) => {
  const result = (await query(
    `
      SELECT *
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `,
    [conversationId]
  )) as { rows: MessageRow[] }
  return result.rows.map(mapMessageRow)
}

export const createMessageRecord = async (payload: {
  conversationId: string
  senderType: SqlSenderType
  senderId: number
  message: string
  attachments?: unknown
}) => {
  const result = (await query(
    `
      INSERT INTO messages (
        conversation_id,
        sender_type,
        sender_id,
        message,
        attachments
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
    `,
    [
      payload.conversationId,
      payload.senderType,
      payload.senderId,
      payload.message,
      payload.attachments === undefined ? null : JSON.stringify(payload.attachments),
    ]
  )) as { rows: MessageRow[] }

  return mapMessageRow(result.rows[0])
}
