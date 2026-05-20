import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getClient, query } from '../db'
import {
  authenticateAgencyAdminStore,
  createAgencyAdminSessionStore,
  deleteAgencyAdminSessionStore,
  getAgencyAdminByTokenStore,
  getAgencyAdminSessionByTokenStore,
  getAgencyNameByIdStore,
  getAgencySummariesStore,
  type AgencyAdminRecord,
} from '../store'

type AgencyAdminRow = {
  id: number
  agency_id: number
  email: string
  password_hash: string
  role: 'admin' | 'agency' | 'staff' | string
  username: string | null
  agency_name: string | null
  profile_image_url: string | null
  created_at: Date | string
}

type AgencyAdminSessionRow = {
  token: string
  admin_id: number
  created_at: Date | string
}

type AgencySummaryRow = {
  agency_id: number
  agency_name: string | null
  email: string
  created_at: Date | string
}

const PASSWORD_SALT = 'agency-admin-auth'
const SYNTHETIC_EMAIL_DOMAIN = 'local.helped.invalid'

const nowIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const normalizeIdentifier = (value: string) => value.trim().toLowerCase()

const hashPassword = (password: string) =>
  scryptSync(password, PASSWORD_SALT, 64).toString('hex')

const verifyPassword = (password: string, passwordHash: string) => {
  if (!passwordHash.trim()) {
    return false
  }

  try {
    const expected = Buffer.from(passwordHash, 'hex')
    const actual = scryptSync(password, PASSWORD_SALT, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

const syntheticEmailForAdmin = (admin: AgencyAdminRecord) =>
  `agency-${admin.agencyId}-admin-${admin.id}@${SYNTHETIC_EMAIL_DOMAIN}`

const isSyntheticEmail = (value: string) => value.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)

const normalizeEmail = (email?: string | null) => {
  const normalized = String(email ?? '').trim().toLowerCase()
  return normalized || null
}

const mapAgencyAdminRow = (row: AgencyAdminRow): AgencyAdminRecord => ({
  id: Number(row.id),
  agencyId: Number(row.agency_id),
  username: row.username?.trim() || row.email.split('@')[0] || `agency-admin-${row.id}`,
  email: isSyntheticEmail(row.email) ? undefined : row.email,
  password: '',
  passwordHash: row.password_hash,
  role: row.role === 'staff' || row.role === 'agency' ? row.role : 'admin',
  agencyName: row.agency_name?.trim() || `Agency ${row.agency_id}`,
  profileImageUrl: row.profile_image_url ?? '',
  createdAt: nowIso(row.created_at),
})

export const syncAgencyAdminsFromStoreRecords = async (records: AgencyAdminRecord[]) => {
  if (records.length === 0) {
    return
  }

  try {
    const dbClient = await getClient()
    await dbClient.query('BEGIN')

    try {
      for (const admin of records) {
        const email = normalizeEmail(admin.email) ?? syntheticEmailForAdmin(admin)
        const passwordHash =
          admin.passwordHash?.trim() || hashPassword(String(admin.password ?? '').trim())

        await dbClient.query(
          `
            INSERT INTO agency_admins (
              agency_id,
              email,
              password_hash,
              role,
              username,
              agency_name,
              profile_image_url,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE
            SET
              agency_id = EXCLUDED.agency_id,
              role = EXCLUDED.role,
              username = COALESCE(EXCLUDED.username, agency_admins.username),
              agency_name = COALESCE(EXCLUDED.agency_name, agency_admins.agency_name),
              profile_image_url = COALESCE(EXCLUDED.profile_image_url, agency_admins.profile_image_url),
              password_hash = CASE
                WHEN COALESCE(agency_admins.password_hash, '') = '' THEN EXCLUDED.password_hash
                ELSE agency_admins.password_hash
              END
          `,
          [
            admin.agencyId,
            email,
            passwordHash,
            admin.role === 'staff' || admin.role === 'agency' ? admin.role : 'admin',
            admin.username?.trim() || null,
            admin.agencyName?.trim() || null,
            admin.profileImageUrl?.trim() || null,
            admin.createdAt ? new Date(admin.createdAt) : new Date(),
          ]
        )
      }

      await dbClient.query('COMMIT')
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL sync unavailable, continuing with local agency admin store only:',
      error instanceof Error ? error.message : error
    )
  }
}

export const authenticateAgencyAdminRecord = async (
  identifier: string,
  password: string
) => {
  const localAdmin = await authenticateAgencyAdminStore(identifier, password)
  if (localAdmin) {
    return localAdmin
  }

  const normalizedIdentifier = normalizeIdentifier(identifier)
  try {
    const result = (await query(
      `
        SELECT *
        FROM agency_admins
        WHERE LOWER(email) = $1 OR LOWER(COALESCE(username, '')) = $1
        ORDER BY id ASC
        LIMIT 1
      `,
      [normalizedIdentifier]
    )) as { rows: AgencyAdminRow[] }

    const row = result.rows[0]
    if (!row) {
      return null
    }

    if (!verifyPassword(password, row.password_hash)) {
      return null
    }

    return mapAgencyAdminRow(row)
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL auth unavailable, local agency admin store did not match:',
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export const createAgencyAdminSessionRecord = async (adminId: number) => {
  const session = await createAgencyAdminSessionStore(adminId)

  try {
    await query(
      `
        INSERT INTO agency_admin_sessions (token, admin_id)
        VALUES ($1, $2)
        ON CONFLICT (token) DO NOTHING
      `,
      [session.token, session.adminId]
    )
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL session mirror unavailable, keeping local session only:',
      error instanceof Error ? error.message : error
    )
  }

  return session
}

export const deleteAgencyAdminSessionRecord = async (token: string) => {
  const localSession = await deleteAgencyAdminSessionStore(token)

  try {
    await query(
      `
        DELETE FROM agency_admin_sessions
        WHERE token = $1
      `,
      [token]
    )
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL session delete unavailable, local session removed only:',
      error instanceof Error ? error.message : error
    )
  }

  return localSession
}

export const getAgencyAdminSessionByTokenRecord = async (token: string) => {
  const localSession = await getAgencyAdminSessionByTokenStore(token)
  if (localSession) {
    return localSession
  }

  try {
    const result = (await query(
      `
        SELECT *
        FROM agency_admin_sessions
        WHERE token = $1
        LIMIT 1
      `,
      [token]
    )) as { rows: AgencyAdminSessionRow[] }

    return result.rows[0]
      ? {
          token: result.rows[0].token,
          adminId: Number(result.rows[0].admin_id),
          createdAt: nowIso(result.rows[0].created_at),
        }
      : null
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL session lookup unavailable:',
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export const getAgencyAdminByTokenRecord = async (token: string) => {
  const localAdmin = await getAgencyAdminByTokenStore(token)
  if (localAdmin) {
    return localAdmin
  }

  try {
    const result = (await query(
      `
        SELECT aa.*
        FROM agency_admin_sessions aas
        INNER JOIN agency_admins aa ON aa.id = aas.admin_id
        WHERE aas.token = $1
        LIMIT 1
      `,
      [token]
    )) as { rows: AgencyAdminRow[] }

    return result.rows[0] ? mapAgencyAdminRow(result.rows[0]) : null
  } catch (error) {
    console.warn(
      '[agency-admin-repo] SQL admin-by-token lookup unavailable:',
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export const listAgencySummariesRecord = async () => {
  return await getAgencySummariesStore()
}

export const getAgencyNameByIdRecord = async (agencyId: number) => {
  return await getAgencyNameByIdStore(agencyId)
}
