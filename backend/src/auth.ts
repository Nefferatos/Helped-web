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
} from './repositories/agencyAdminRepository'

type CachedAgencyAdminSession = {
  admin: AgencyAdminRecord
  expiresAt: number
}

const AGENCY_ADMIN_SESSION_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const agencyAdminSessionCache = new Map<string, CachedAgencyAdminSession>()

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

const getCachedAgencyAdmin = (token: string) => {
  const cached = agencyAdminSessionCache.get(token)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    agencyAdminSessionCache.delete(token)
    return null
  }

  return cached.admin
}

export const rememberAgencyAdminSession = (
  token: string,
  admin: AgencyAdminRecord
) => {
  if (!token.trim()) {
    return
  }

  agencyAdminSessionCache.set(token, {
    admin,
    expiresAt: Date.now() + AGENCY_ADMIN_SESSION_CACHE_TTL_MS,
  })
}

export const revokeAgencyAdminSession = (token: string) => {
  if (!token.trim()) {
    return
  }

  agencyAdminSessionCache.delete(token)
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

  const cachedAdmin = getCachedAgencyAdmin(token)
  if (cachedAdmin) {
    req.admin = cachedAdmin
    req.agencyId = cachedAdmin.agencyId
    return cachedAdmin
  }

  try {
    const admin = await getAgencyAdminByTokenRecord(token)
    if (!admin) {
      return null
    }

    rememberAgencyAdminSession(token, admin)
    req.admin = admin
    req.agencyId = admin.agencyId
    return admin
  } catch (error) {
    const cachedFallback = getCachedAgencyAdmin(token)
    if (cachedFallback) {
      console.warn(
        '[auth] Falling back to cached agency admin session after database error'
      )
      req.admin = cachedFallback
      req.agencyId = cachedFallback.agencyId
      return cachedFallback
    }

    throw error
  }
}

export const getRequestToken = (req: Request) => getBearerToken(req)

export const getRequestAgencyId = async (req: Request, fallback = 1) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  return admin?.agencyId ?? req.agencyId ?? fallback
}
