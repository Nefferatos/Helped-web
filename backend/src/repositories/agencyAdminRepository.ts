import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getClient, query } from '../db'
import type { AgencyAdminRecord } from '../store'

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

  const dbClient = await getClient()

  try {
    await dbClient.query('BEGIN')

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
}

export const authenticateAgencyAdminRecord = async (
  identifier: string,
  password: string
) => {
  const normalizedIdentifier = normalizeIdentifier(identifier)
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
}

export const createAgencyAdminSessionRecord = async (adminId: number) => {
  const token = randomBytes(24).toString('hex')
  const result = (await query(
    `
      INSERT INTO agency_admin_sessions (token, admin_id)
      VALUES ($1, $2)
      RETURNING *
    `,
    [token, adminId]
  )) as { rows: AgencyAdminSessionRow[] }

  return {
    token: result.rows[0].token,
    adminId: Number(result.rows[0].admin_id),
    createdAt: nowIso(result.rows[0].created_at),
  }
}

export const deleteAgencyAdminSessionRecord = async (token: string) => {
  const result = (await query(
    `
      DELETE FROM agency_admin_sessions
      WHERE token = $1
      RETURNING *
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
}

export const getAgencyAdminSessionByTokenRecord = async (token: string) => {
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
}

export const getAgencyAdminByTokenRecord = async (token: string) => {
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
}

export const listAgencySummariesRecord = async () => {
  const result = (await query(
    `
      SELECT DISTINCT ON (agency_id)
        agency_id,
        agency_name,
        email,
        created_at
      FROM agency_admins
      ORDER BY agency_id ASC, id ASC
    `
  )) as { rows: AgencySummaryRow[] }

  return result.rows.map((row) => ({
    id: Number(row.agency_id),
    name: row.agency_name?.trim() || `Agency ${row.agency_id}`,
    email: row.email,
    createdAt: nowIso(row.created_at),
  }))
}

export const getAgencyNameByIdRecord = async (agencyId: number) => {
  const result = (await query(
    `
      SELECT agency_name
      FROM agency_admins
      WHERE agency_id = $1
      ORDER BY id ASC
      LIMIT 1
    `,
    [agencyId]
  )) as { rows: Array<{ agency_name: string | null }> }

  return result.rows[0]?.agency_name?.trim() || `Agency ${agencyId}`
}
