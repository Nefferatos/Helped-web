export type SupabaseAuthUser = {
  id: string
  email?: string
  phone?: string
  user_metadata?: Record<string, unknown>
}

type CacheEntry = {
  expiresAt: number
  user: SupabaseAuthUser
}

const VERIFY_TIMEOUT_MS = 5000
const CACHE_TTL_MS = 30_000

const verifiedUserCache = new Map<string, CacheEntry>()
const inflightVerifications = new Map<string, Promise<SupabaseAuthUser | null>>()

const readSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null
  }

  return { supabaseUrl, supabaseServiceRoleKey }
}

const getCachedUser = (token: string) => {
  const cached = verifiedUserCache.get(token)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    verifiedUserCache.delete(token)
    return null
  }

  return cached.user
}

export const verifySupabaseToken = async (
  token: string
): Promise<SupabaseAuthUser | null> => {
  const cached = getCachedUser(token)
  if (cached) {
    return cached
  }

  const inflight = inflightVerifications.get(token)
  if (inflight) {
    return inflight
  }

  const config = readSupabaseConfig()
  if (!config) {
    console.error('Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return null
  }

  const verification = (async () => {
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: config.supabaseServiceRoleKey,
          authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      })

      if (!response.ok) {
        let details = ''
        try {
          details = await response.text()
        } catch {
          // ignore response body read issues
        }

        console.error('Supabase auth verify failed:', {
          status: response.status,
          supabaseUrl: config.supabaseUrl,
          tokenLength: token.length,
          details: details.slice(0, 300),
        })
        return null
      }

      const user = (await response.json()) as SupabaseAuthUser
      verifiedUserCache.set(token, {
        user,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
      return user
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Supabase auth verify timed out after ${VERIFY_TIMEOUT_MS}ms`)
        return null
      }

      console.error('Supabase auth verify failed:', error)
      return null
    } finally {
      inflightVerifications.delete(token)
    }
  })()

  inflightVerifications.set(token, verification)
  return verification
}
