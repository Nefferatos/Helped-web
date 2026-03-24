// PostgreSQL Database Connection Configuration
// This file establishes and manages the connection to the PostgreSQL database using the pg library

import pkg from 'pg'
import dotenv from 'dotenv'
import { readFile } from 'fs/promises'
import path from 'path'

const { Pool } = pkg

// Load environment variables from .env file
dotenv.config()

// Create a connection pool for better performance
// The pool manages multiple connections to the database automatically
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maid_agency_db',
})

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

/**
 * Execute a database query
 * @param text - SQL query string
 * @param params - Query parameters for prepared statements (prevents SQL injection)
 * @returns Query result with rows array
 */
export const query = async (text: string, params: unknown[] = []) => {
  try {
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

/**
 * Get a single client from the pool for transaction handling
 * @returns Database client for manual transaction management
 */
export const getClient = async () => {
  return await pool.connect()
}

export const initializeDatabase = async () => {
  const client = await pool.connect()

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
        '80730757',
        'info@theagency.sg',
        'Mon-Sat: 9:00am to 7:30pm',
        '80730757',
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

export default pool
