import { randomUUID } from 'crypto'

const bucket = process.env.SUPABASE_PRIVATE_STORAGE_BUCKET?.trim() || 'helped-private'
const storagePrefix = `storage://${bucket}/`

const config = () => {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!baseUrl || !serviceKey) {
    throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
  }
  return { baseUrl, serviceKey }
}

const encodeObjectPath = (objectPath: string) =>
  objectPath.split('/').map(encodeURIComponent).join('/')

export const makePrivateStoragePath = (...parts: string[]) =>
  parts.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '')

export const isPrivateStorageRef = (value: string) => value.startsWith(storagePrefix)

export const privateStoragePathFromRef = (value: string) =>
  isPrivateStorageRef(value) ? value.slice(storagePrefix.length) : null

/** Uploads bytes without ever making the object public. */
export const uploadPrivateObject = async (input: {
  objectPath: string
  body: Buffer
  contentType: string
}) => {
  const { baseUrl, serviceKey } = config()
  const objectPath = input.objectPath.replace(/^\/+/, '')
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': input.contentType || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: input.body,
    },
  )
  if (!response.ok) throw new Error(`PRIVATE_STORAGE_UPLOAD_FAILED:${response.status}`)
  return `${storagePrefix}${objectPath}`
}

export const createPrivateSignedUrl = async (reference: string, expiresIn = 300) => {
  const objectPath = privateStoragePathFromRef(reference)
  if (!objectPath) return reference
  const { baseUrl, serviceKey } = config()
  const response = await fetch(
    `${baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    {
      method: 'POST',
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: Math.max(60, Math.min(expiresIn, 3600)) }),
    },
  )
  if (!response.ok) throw new Error(`PRIVATE_STORAGE_SIGN_FAILED:${response.status}`)
  const result = (await response.json()) as { signedURL?: string }
  if (!result.signedURL) throw new Error('PRIVATE_STORAGE_SIGN_FAILED')
  return `${baseUrl}/storage/v1${result.signedURL}`
}

export const downloadPrivateObject = async (reference: string) => {
  const objectPath = privateStoragePathFromRef(reference)
  if (!objectPath) return null
  const { baseUrl, serviceKey } = config()
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  )
  if (!response.ok) throw new Error(`PRIVATE_STORAGE_DOWNLOAD_FAILED:${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

export const newPrivateObjectName = (name: string) => `${randomUUID()}-${name}`
