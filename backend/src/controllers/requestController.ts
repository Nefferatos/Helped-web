import { Request, Response } from 'express'
import {
  getAuthenticatedAgencyAdmin,
  getAuthenticatedClient,
} from '../auth'
import {
  getAllMaidsStore,
  getClientsStore,
  getPublicMaidByReferenceCodeStore,
  type ClientRecord,
  type MaidRecord,
} from '../store'
import {
  createRequestRecord,
  getRequestRecordById,
  listRequestRecords,
  type SqlRequestRecord,
  updateRequestMaidsRecord,
  updateRequestStatusRecord,
} from '../repositories/requestRepository'
import { getAgencyNameByIdRecord } from '../repositories/agencyAdminRepository'

type RequestType = 'general' | 'direct'
type RequestStatus = 'pending' | 'interested' | 'direct_hire' | 'rejected'

const REQUEST_STATUSES: RequestStatus[] = [
  'pending',
  'interested',
  'direct_hire',
  'rejected',
]

const requestStatusSet = new Set<RequestStatus>(REQUEST_STATUSES)

const toRequestStatus = (value: unknown): RequestStatus => {
  const normalized = String(value ?? '').trim()
  return requestStatusSet.has(normalized as RequestStatus)
    ? (normalized as RequestStatus)
    : 'pending'
}

const requestBudget = (details: Record<string, unknown>) => {
  const budget = details.budget
  return typeof budget === 'string' && budget.trim() ? budget.trim() : null
}

const requestSummary = (request: SqlRequestRecord, maids: MaidRecord[]) => {
  if (request.type === 'direct') {
    const firstReference = request.maidReferences[0]
    const matchedMaid = firstReference
      ? maids.find((maid) => maid.referenceCode === firstReference)
      : null
    const label = matchedMaid?.fullName || firstReference || 'Maid request'
    return `Direct request for ${label}`
  }

  const details = request.details ?? {}
  const primaryDuty =
    typeof details.primaryDuty === 'string' && details.primaryDuty.trim()
      ? details.primaryDuty.trim()
      : null
  const nationality =
    typeof details.nationality === 'string' && details.nationality.trim()
      ? details.nationality.trim()
      : null

  if (primaryDuty && nationality) {
    return `${primaryDuty} request (${nationality})`
  }
  if (primaryDuty) {
    return `${primaryDuty} request`
  }
  if (nationality) {
    return `${nationality} maid request`
  }
  return 'General maid request'
}

const buildRequestResponse = (
  request: SqlRequestRecord,
  clients: ClientRecord[],
  maids: MaidRecord[],
  agencyName: string
) => {
  const details = (request.details ?? {}) as Record<string, unknown>
  const client =
    request.clientId > 0 ? clients.find((item) => item.id === request.clientId) ?? null : null
  const maidReferences = Array.isArray(request.maidReferences) ? request.maidReferences : []
  const fallbackClientName =
    typeof details.clientName === 'string' && details.clientName.trim()
      ? details.clientName.trim()
      : null
  const fallbackClientEmail =
    typeof details.clientEmail === 'string' && details.clientEmail.trim()
      ? details.clientEmail.trim()
      : null
  const fallbackClientPhone =
    typeof details.clientPhone === 'string' && details.clientPhone.trim()
      ? details.clientPhone.trim()
      : null

  return {
    id: request.id,
    clientId: request.clientId > 0 ? request.clientId : null,
    type: request.type,
    agencyId: request.agencyId,
    agencyName,
    status: toRequestStatus(request.status),
    summary: requestSummary(request, maids),
    budget: requestBudget(details),
    details,
    maidReferences,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    updatedBy: request.updatedBy,
    client: client
      ? {
          id: client.id,
          name: client.name,
          company: client.company ?? '',
          phone: client.phone ?? '',
          email: client.email,
          createdAt: client.createdAt,
          profileImageUrl: client.profileImageUrl ?? '',
        }
      : fallbackClientName || fallbackClientEmail || fallbackClientPhone
      ? {
          id: 0,
          name: fallbackClientName || 'Client request',
          company: '',
          phone: fallbackClientPhone ?? '',
          email: fallbackClientEmail || 'No email',
          createdAt: request.createdAt,
          profileImageUrl: '',
        }
      : null,
    maids: maidReferences
      .map((referenceCode) => maids.find((maid) => maid.referenceCode === referenceCode) ?? null)
      .filter((maid): maid is MaidRecord => Boolean(maid))
      .map((maid) => ({
        referenceCode: maid.referenceCode,
        fullName: maid.fullName,
        nationality: maid.nationality,
        status: maid.status ?? 'available',
        type: maid.type,
        photoDataUrl: maid.photoDataUrl,
      })),
  }
}

const logRequestEvent = (event: string, payload: Record<string, unknown>) => {
  console.info(`[requests] ${event}`, payload)
}

export const listRequests = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const client = admin ? null : await getAuthenticatedClient(req)
    const isGlobalAdmin = admin?.role === 'admin'
    const requestedClientId = Number(req.query.clientId ?? '')
    const requestedAgencyId = Number(req.query.agencyId ?? '')
    const [clients, maids] = await Promise.all([getClientsStore(), getAllMaidsStore()])

    const page = Math.max(1, Number(req.query.page ?? '1') || 1)
    const pageSize = Math.min(24, Math.max(1, Number(req.query.pageSize ?? '12') || 12))
const clientId =
  client?.id ??
  (Number.isInteger(requestedClientId) && requestedClientId > 0 ? requestedClientId : null)
    if (!admin && clientId == null) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const status = typeof req.query.status === 'string' ? req.query.status : ''
    const query = String(req.query.q ?? '').trim().toLowerCase()

    const agencyId =
      isGlobalAdmin && Number.isInteger(requestedAgencyId) && requestedAgencyId > 0
        ? requestedAgencyId
        : admin && !isGlobalAdmin
        ? admin.agencyId
        : undefined
    const result = await listRequestRecords({
      ...(typeof agencyId === 'number' ? { agencyId } : {}),
      ...(typeof clientId === 'number' && Number.isInteger(clientId) && clientId > 0 ? { clientId } : {}),
      ...(requestStatusSet.has(status as RequestStatus)
        ? { status: status as RequestStatus }
        : {}),
      ...(query ? { query } : {}),
      page,
      pageSize,
    })

    logRequestEvent('fetchRequests filter', {
      actor: admin ? `agency:${admin.id}` : client ? `client:${client.id}` : 'anonymous',
      role: admin?.role ?? null,
      agencyId: agencyId ?? null,
      clientId: clientId ?? null,
      query,
      status: status || null,
    })

    const pagedItems = await Promise.all(
      result.items.map(async (request) =>
        buildRequestResponse(
          request,
          clients,
          maids,
          await getAgencyNameByIdRecord(request.agencyId)
        )
      )
    )

    logRequestEvent('list response', {
      actor: admin ? `agency:${admin.id}` : client ? `client:${client.id}` : 'anonymous',
      role: admin?.role ?? null,
      agencyId: admin?.agencyId ?? null,
      clientId: clientId ?? null,
      page,
      pageSize,
      total: result.total,
      returned: pagedItems.length,
      requestIds: pagedItems.map((item) => item.id),
    })

    res.status(200).json({
      data: pagedItems,
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      },
    })
  } catch (error) {
    console.error('Error fetching requests:', error)
    res.status(500).json({ error: 'Failed to fetch requests' })
  }
}

export const getRequest = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const client = admin ? null : await getAuthenticatedClient(req)
    const id = String(req.params.id ?? '').trim()
    if (!id) {
      return res.status(400).json({ error: 'Valid request id is required' })
    }

    const requestRecord = await getRequestRecordById(id)
    if (!requestRecord) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (admin && admin.role !== 'admin' && requestRecord.agencyId !== admin.agencyId) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (!admin && client?.id !== requestRecord.clientId) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const [clients, maids] = await Promise.all([getClientsStore(), getAllMaidsStore()])
    const request = buildRequestResponse(requestRecord, clients, maids, await getAgencyNameByIdRecord(requestRecord.agencyId))
    logRequestEvent('get response', {
      actor: admin ? `agency:${admin.id}` : client ? `client:${client.id}` : 'anonymous',
      requestId: request.id,
      agencyId: request.agencyId,
      clientId: request.clientId,
      status: request.status,
    })
    res.status(200).json({ data: request })
  } catch (error) {
    console.error('Error fetching request:', error)
    res.status(500).json({ error: 'Failed to fetch request' })
  }
}

export const createRequest = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as {
      clientId?: number
      agencyId?: number
      type?: RequestType
      details?: Record<string, unknown>
      maidReferences?: string[]
    }

    const client = await getAuthenticatedClient(req)
    const admin = client ? null : await getAuthenticatedAgencyAdmin(req)

    logRequestEvent('create payload', {
      clientId: body.clientId ?? null,
      agencyId: body.agencyId ?? null,
      type: body.type ?? null,
      maidReferences: Array.isArray(body.maidReferences) ? body.maidReferences : [],
      detailKeys:
        body.details && typeof body.details === 'object'
          ? Object.keys(body.details)
          : [],
    })

    const requestedClientId = Number(body.clientId)
    const normalizedClientId =
      client?.id ??
      (admin && Number.isInteger(requestedClientId) && requestedClientId > 0
        ? requestedClientId
        : 0)

    if (normalizedClientId <= 0) {
      return res.status(400).json({ error: 'clientId is required' })
    }
    if (body.type !== 'general' && body.type !== 'direct') {
      return res.status(400).json({ error: 'type is required' })
    }
    if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) {
      return res.status(400).json({ error: 'details is required' })
    }

    const allMaids = await getAllMaidsStore()
    const maidReferences = Array.isArray(body.maidReferences)
      ? body.maidReferences
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
      : []

    const invalidMaidReference = maidReferences.find(
      (referenceCode: string) =>
        !allMaids.some((maid) => maid.referenceCode === referenceCode)
    )
    if (invalidMaidReference) {
      return res.status(404).json({ error: `Maid not found: ${invalidMaidReference}` })
    }

    const type: RequestType =
      body.type === 'direct' || maidReferences.length > 0 ? 'direct' : 'general'
    const firstReference = maidReferences[0] ?? null
    const details = (body.details ?? {}) as Record<string, unknown>
    const directMaid =
      firstReference
        ? await getPublicMaidByReferenceCodeStore(firstReference)
        : null
    const requestedAgencyId = Number(body.agencyId ?? '')
    const agencyId =
      directMaid?.agencyId ??
      (Number.isInteger(requestedAgencyId) && requestedAgencyId > 0 ? requestedAgencyId : 1)

    const requestData = {
      clientId: normalizedClientId,
      agencyId,
      type,
      maidReferences,
      details,
    }

    console.log('NEW REQUEST:', requestData)

    const result = await createRequestRecord({
      ...requestData,
      updatedBy: admin ? `agency:${admin.id}` : `client:${normalizedClientId}`,
    })

    logRequestEvent('create insert result', {
      requestId: result.request.id,
      agencyId: result.request.agencyId,
      clientId: result.request.clientId,
      status: result.request.status,
      maidReferences,
      type,
    })

    const [clients, maids] = await Promise.all([getClientsStore(), getAllMaidsStore()])
    const request = buildRequestResponse(
      result.request,
      clients,
      maids,
      await getAgencyNameByIdRecord(result.request.agencyId)
    )
    res.status(201).json({ data: request })
  } catch (error) {
    console.error('Error creating request:', error)
    res.status(500).json({ error: 'Failed to create request' })
  }
}

export const patchRequestStatus = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = String(req.params.id ?? '').trim()
    if (!id) {
      return res.status(400).json({ error: 'Valid request id is required' })
    }

    const nextStatus = toRequestStatus(req.body?.status)
    if (!req.body?.status || !requestStatusSet.has(nextStatus)) {
      return res.status(400).json({ error: 'status is required' })
    }

    const requestRecord = await getRequestRecordById(id)
    if (!requestRecord) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (admin.role !== 'admin' && requestRecord.agencyId !== admin.agencyId) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const updated = await updateRequestStatusRecord(
      id,
      requestRecord.agencyId,
      nextStatus,
      `agency:${admin.id}`
    )
    if (!updated) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const [clients, maids] = await Promise.all([getClientsStore(), getAllMaidsStore()])
    const request = buildRequestResponse(
      updated,
      clients,
      maids,
      await getAgencyNameByIdRecord(updated.agencyId)
    )
    res.status(200).json({ data: request })
  } catch (error) {
    console.error('Error updating request status:', error)
    res.status(500).json({ error: 'Failed to update request status' })
  }
}

export const patchRequestMaids = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = String(req.params.id ?? '').trim()
    if (!id) {
      return res.status(400).json({ error: 'Valid request id is required' })
    }

    const maidReferences = Array.isArray(req.body?.maidReferences)
      ? req.body.maidReferences
          .map((item: unknown) => String(item).trim())
          .filter((item: string) => item.length > 0)
      : []

    const allMaids = await getAllMaidsStore()
    const invalidMaidReference = maidReferences.find(
      (referenceCode: string) =>
        !allMaids.some((maid) => maid.referenceCode === referenceCode)
    )
    if (invalidMaidReference) {
      return res.status(404).json({ error: `Maid not found: ${invalidMaidReference}` })
    }

    const requestRecord = await getRequestRecordById(id)
    if (!requestRecord) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (admin.role !== 'admin' && requestRecord.agencyId !== admin.agencyId) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const updated = await updateRequestMaidsRecord(id, requestRecord.agencyId, maidReferences, `agency:${admin.id}`)
    if (!updated) {
      return res.status(404).json({ error: 'Request not found' })
    }

    const [clients, maids] = await Promise.all([getClientsStore(), getAllMaidsStore()])
    const request = buildRequestResponse(
      updated,
      clients,
      maids,
      await getAgencyNameByIdRecord(updated.agencyId)
    )
    res.status(200).json({ data: request })
  } catch (error) {
    console.error('Error updating request maids:', error)
    res.status(500).json({ error: 'Failed to update request maids' })
  }
}
