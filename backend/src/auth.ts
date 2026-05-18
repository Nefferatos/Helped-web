import { Request } from 'express'
import {
  AgencyAdminRecord,
  ClientRecord,
  getClientByTokenStore,
  getOrCreateClientBySupabaseUserStore,
} from './store'
import { verifySupabaseToken } from './lib/supabaseAuthVerify'
import {
  getAgencyAdminByTokenRecord,
  getAgencyAdminSessionByTokenRecord,
} from './repositories/agencyAdminRepository'

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export const getAuthenticatedClient = async (
  req: Request
): Promise<ClientRecord | null> => {
  const token = getBearerToken(req)
  if (!token) {
    console.warn('Auth: missing Authorization Bearer token for client request')
    return null
  }

  const existing = await getClientByTokenStore(token)
  if (existing) {
    return existing
  }

  // Supabase JWT support for social/phone login.
  if (!token.includes('.')) {
    console.warn('Auth: non-JWT token provided; no matching legacy session found')
    return null
  }

  const user = await verifySupabaseToken(token)
  if (!user) {
    return null
  }

  return await getOrCreateClientBySupabaseUserStore(user)
}

export const getAuthenticatedAgencyAdmin = async (
  req: Request
): Promise<AgencyAdminRecord | null> => {
  if (req.admin && req.agencyId === req.admin.agencyId) {
    return req.admin
  }

  const token = getBearerToken(req)
  if (!token) {
    return null
  }

  const session = await getAgencyAdminSessionByTokenRecord(token)
  if (!session) {
    return null
  }

  const admin = await getAgencyAdminByTokenRecord(token)
  if (!admin) {
    return null
  }

  req.admin = admin
  req.agencyId = admin.agencyId
  return admin
}

export const getRequestToken = (req: Request) => getBearerToken(req)

export const getRequestAgencyId = async (req: Request, fallback = 1) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  return admin?.agencyId ?? req.agencyId ?? fallback
}
