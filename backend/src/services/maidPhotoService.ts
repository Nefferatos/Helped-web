import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { downloadPrivateObject, isPrivateStorageRef } from './privateStorageService'

const uploadsRoot = path.resolve(__dirname, '../../data/uploads')
const photoTokenTtlMs = 5 * 60 * 1000

type OriginalPhotoToken = {
  agencyId: number
  referenceCode: string
  photoIndex: number
  expiresAt: number
}

const originalPhotoTokens = new Map<string, OriginalPhotoToken>()

const normalizePhotoSource = (source: string) => {
  if (!source.startsWith('http://') && !source.startsWith('https://')) return source
  try {
    return new URL(source).pathname
  } catch {
    return source
  }
}

const readLocalMaidPhoto = async (source: string) => {
  const relativePath = normalizePhotoSource(source).replace(/^\/uploads\//, '')
  const absolutePath = path.resolve(uploadsRoot, relativePath)
  const maidsRoot = path.resolve(uploadsRoot, 'maids')
  if (!absolutePath.startsWith(`${maidsRoot}${path.sep}`)) {
    throw new Error('INVALID_MAID_PHOTO_PATH')
  }
  return readFile(absolutePath)
}

/** Read a private Storage object or a legacy local maid photo. */
export const readMaidPhotoBytes = async (source: string) => {
  const value = String(source ?? '').trim()
  if (!value) throw new Error('MAID_PHOTO_NOT_FOUND')
  if (isPrivateStorageRef(value)) {
    const bytes = await downloadPrivateObject(value)
    if (!bytes) throw new Error('MAID_PHOTO_NOT_FOUND')
    return bytes
  }
  if (value.startsWith('data:')) {
    const comma = value.indexOf(',')
    if (comma === -1) throw new Error('INVALID_MAID_PHOTO')
    return Buffer.from(value.slice(comma + 1), 'base64')
  }
  return readLocalMaidPhoto(value)
}

/** Creates the only image bytes exposed to unauthenticated visitors. */
export const createBlurredPhotoPreview = async (source: string) =>
  sharp(await readMaidPhotoBytes(source), { failOn: 'none' })
    .resize({ width: 420, height: 540, fit: 'cover', withoutEnlargement: true })
    .blur(22)
    .webp({ quality: 58 })
    .toBuffer()

export const issueOriginalPhotoToken = (input: Omit<OriginalPhotoToken, 'expiresAt'>) => {
  const token = randomUUID()
  originalPhotoTokens.set(token, { ...input, expiresAt: Date.now() + photoTokenTtlMs })
  return token
}

export const consumeOriginalPhotoToken = (token: string) => {
  const record = originalPhotoTokens.get(token)
  if (!record || record.expiresAt <= Date.now()) {
    originalPhotoTokens.delete(token)
    return null
  }
  return record
}

setInterval(() => {
  const now = Date.now()
  for (const [token, record] of originalPhotoTokens) {
    if (record.expiresAt <= now) originalPhotoTokens.delete(token)
  }
}, 60_000).unref()
