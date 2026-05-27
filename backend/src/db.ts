// PostgreSQL Database Connection Configuration
// This file establishes and manages the connection to the PostgreSQL database using the pg library

import pkg from 'pg'
import dotenv from 'dotenv'
import { readFile } from 'fs/promises'
import path from 'path'

const { Pool } = pkg

// Load environment variables from .env file
dotenv.config()

const connectionString = process.env.DATABASE_URL?.trim()
const localDbHost = process.env.DB_HOST?.trim() || 'localhost'
const localDbPort = parseInt(process.env.DB_PORT || '5432')
const localDbUser = process.env.DB_USER?.trim() || 'postgres'
const localDbPassword = process.env.DB_PASSWORD ?? 'postgres'
const localDbName = process.env.DB_NAME?.trim() || 'maid_agency_db'
const localDbSslEnabled = process.env.DB_SSL === 'true'
const dbPoolMax = parseInt(process.env.DB_POOL_MAX || '10', 10)
const dbIdleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10)
const dbConnectionTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '3500', 10)
const dbQueryTimeoutMs = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '12000', 10)
const dbStatementTimeoutMs = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '12000', 10)
const dbReconnectCooldownMs = parseInt(process.env.DB_RECONNECT_COOLDOWN_MS || '30000', 10)

const isTransientDbConnectionError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
  const message =
    'message' in error ? String((error as { message?: unknown }).message ?? '').toLowerCase() : ''

  return (
    code.startsWith('08') ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('connection terminated') ||
    message.includes('connection refused')
  )
}

const attachPoolErrorHandler = (pool: InstanceType<typeof Pool>) => {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
  })
}

const createPool = (config: ConstructorParameters<typeof Pool>[0]) => {
  const pool = new Pool({
    max: dbPoolMax,
    idleTimeoutMillis: dbIdleTimeoutMs,
    connectionTimeoutMillis: dbConnectionTimeoutMs,
    query_timeout: dbQueryTimeoutMs,
    statement_timeout: dbStatementTimeoutMs,
    keepAlive: true,
    ...config,
  })
  attachPoolErrorHandler(pool)
  return pool
}

const buildPoolCandidates = () => {
  const candidates: Array<{
    label: string
    config: ConstructorParameters<typeof Pool>[0]
  }> = []

  if (connectionString) {
    candidates.push({
      label: 'DATABASE_URL',
      config: {
        connectionString,
        ssl:
          localDbSslEnabled || connectionString.includes('supabase.co')
            ? { rejectUnauthorized: false }
            : undefined,
      },
    })
  }

  candidates.push({
    label: 'DB_*',
    config: {
      user: localDbUser,
      password: localDbPassword,
      host: localDbHost,
      port: localDbPort,
      database: localDbName,
      ssl: localDbSslEnabled ? { rejectUnauthorized: false } : undefined,
    },
  })

  return candidates
}

let pool: InstanceType<typeof Pool> | null = null
let poolReconnectAfter = 0
let lastPoolFailure: unknown = null

const ensurePool = async () => {
  if (pool) {
    return pool
  }

  if (poolReconnectAfter > Date.now()) {
    throw lastPoolFailure instanceof Error
      ? lastPoolFailure
      : new Error('Database temporarily unavailable')
  }

  let lastError: unknown = null

  for (const candidate of buildPoolCandidates()) {
    const candidatePool = createPool(candidate.config)

    try {
      const client = await candidatePool.connect()
      client.release()
      pool = candidatePool
      poolReconnectAfter = 0
      lastPoolFailure = null
      console.info(`[db] Connected using ${candidate.label}`)
      return pool
    } catch (error) {
      lastError = error
      const message =
        error instanceof Error ? error.message : 'Unknown database connection error'
      console.error(`[db] Failed to connect using ${candidate.label}: ${message}`)
      await candidatePool.end().catch(() => undefined)
    }
  }

  lastPoolFailure = lastError
  poolReconnectAfter = Date.now() + dbReconnectCooldownMs
  throw lastError
}

/**
 * Execute a database query
 * @param text - SQL query string
 * @param params - Query parameters for prepared statements (prevents SQL injection)
 * @returns Query result with rows array
 */
export const query = async (text: string, params: unknown[] = []) => {
  try {
    const activePool = await ensurePool()
    const result = await activePool.query(text, params)
    poolReconnectAfter = 0
    lastPoolFailure = null
    return result
  } catch (error) {
    if (isTransientDbConnectionError(error)) {
      if (pool) {
        await pool.end().catch(() => undefined)
        pool = null
      }
      lastPoolFailure = error
      poolReconnectAfter = Date.now() + dbReconnectCooldownMs
    }
    console.error('Database query error:', error)
    throw error
  }
}

/**
 * Get a single client from the pool for transaction handling
 * @returns Database client for manual transaction management
 */
export const getClient = async () => {
  const activePool = await ensurePool()
  return await activePool.connect()
}

export const initializeDatabase = async () => {
  const activePool = await ensurePool()
  const client = await activePool.connect()

  try {
    const schemaPath = path.resolve(__dirname, '../schema.sql')
    const schemaSql = await readFile(schemaPath, 'utf8')

    await client.query(schemaSql)

    await client.query(
      `
        INSERT INTO company_profile (
          id,
          company_name,
          short_name,
          license_no,
          address_line1,
          postal_code,
          country,
          contact_person,
          contact_phone,
          contact_email,
          office_hours_regular,
          social_whatsapp_number,
          social_whatsapp_message,
          updated_at
        ) VALUES (
          1,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        'At The Agency (formerly Rinzin Agency Pte. Ltd.)',
        'At The Agency',
        '2503114',
        'Singapore',
        '000000',
        'Singapore',
        'Bala',
        '+65 80730757',
        'info@theagency.sg',
        'Mon-Sat: 9:00am to 7:30pm',
        '+65 80730757',
        'Hello, I am interested in your agency profile.',
        new Date(),
      ]
    )

    await client.query(
      `
        SELECT setval(
          pg_get_serial_sequence('company_profile', 'id'),
          GREATEST((SELECT COALESCE(MAX(id), 1) FROM company_profile), 1)
        )
      `
    )
  } finally {
    client.release()
  }
}
