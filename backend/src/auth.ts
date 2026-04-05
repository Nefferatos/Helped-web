import { Request } from 'express'
import {
  AgencyAdminRecord,
  ClientRecord,
  getAgencyAdminByTokenStore,
  getClientByTokenStore,
  getOrCreateClientBySupabaseUserStore,
} from './store'

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
    return null
  }

  const existing = await getClientByTokenStore(token)
  if (existing) {
    return existing
  }

  // Supabase JWT support for social/phone login.
  if (!token.includes('.')) {
    return null
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars')
    return null
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const user = (await response.json()) as {
      id: string
      email?: string
      phone?: string
      user_metadata?: Record<string, unknown>
    }

    return await getOrCreateClientBySupabaseUserStore(user)
  } catch (err) {
    console.error('Supabase auth error:', err)
    return null
  }
}

export const getAuthenticatedAgencyAdmin = async (
  req: Request
): Promise<AgencyAdminRecord | null> => {
  const token = getBearerToken(req)
  if (!token) {
    return null
  }

  return getAgencyAdminByTokenStore(token)
}

export const getRequestToken = (req: Request) => getBearerToken(req)
