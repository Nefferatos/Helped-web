import { Request, Response } from 'express'
import { createWriteStream } from 'fs'
import { mkdir, readFile, rm } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { Readable } from 'stream'
import { getRequestAgencyId } from '../auth'
import {
  addEmployerContractFilesStore,
  deleteEmployerContractFileStore,
  getEmployerContractFileStore,
  getEmployerContractFilesStore,
} from '../store'

const MAX_FILES = 10
const MAX_BYTES_PER_FILE = 100 * 1024 * 1024
const PDF_ONLY_MESSAGE = 'Only PDF files are allowed'
const FILE_SIZE_LIMIT_MESSAGE = 'File exceeds 100MB limit'
const uploadsRoot = path.resolve(__dirname, '../../data/uploads')
const PDF_HEADER = Buffer.from('%PDF-', 'ascii')

const normalizeBase64 = (value: string) => value.replace(/\s+/g, '')

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sanitizePathSegment = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || fallback
}

const buildUploadTarget = (
  agencyId: number,
  refCode: string,
  fileName: string
) => {
  const safeRef = sanitizePathSegment(refCode, 'general')
  const sanitizedName = sanitizePathSegment(fileName, 'document.pdf')
  const extension = path.extname(sanitizedName).toLowerCase() || '.pdf'
  const baseName = path.basename(sanitizedName, path.extname(sanitizedName)) || 'document'
  const uniqueFileName = `${baseName}-${randomUUID()}${extension}`
  const relativePath = path
    .posix
    .join('employer-contract-files', `agency-${agencyId}`, safeRef, uniqueFileName)
  return {
    absolutePath: path.join(uploadsRoot, relativePath),
    relativePath,
  }
}

const writeChunk = async (stream: ReturnType<typeof createWriteStream>, chunk: Buffer) => {
  if (stream.write(chunk)) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    stream.once('drain', resolve)
    stream.once('error', reject)
  })
}

const streamMultipartPdfToDisk = async (
  file: {
    name: string
    type: string
    size?: number
    stream: () => unknown
  },
  agencyId: number,
  refCode: string
) => {
  if (file.type.trim().toLowerCase() !== 'application/pdf') {
    throw new Error(PDF_ONLY_MESSAGE)
  }

  const target = buildUploadTarget(agencyId, refCode, file.name)
  await mkdir(path.dirname(target.absolutePath), { recursive: true })

  const fileStream = file.stream()
  const nodeStream = Readable.fromWeb(fileStream as globalThis.ReadableStream)
  const output = createWriteStream(target.absolutePath, { flags: 'wx' })

  let totalBytes = 0
  let header = Buffer.alloc(0)

  try {
    for await (const chunk of nodeStream) {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      totalBytes += bufferChunk.length

      if (totalBytes > MAX_BYTES_PER_FILE) {
        throw new Error(FILE_SIZE_LIMIT_MESSAGE)
      }

      if (header.length < PDF_HEADER.length) {
        header = Buffer.concat([header, bufferChunk]).subarray(0, PDF_HEADER.length)
        if (
          header.length === PDF_HEADER.length &&
          !header.equals(PDF_HEADER)
        ) {
          throw new Error(PDF_ONLY_MESSAGE)
        }
      }

      await writeChunk(output, bufferChunk)
    }

    if (header.length < PDF_HEADER.length || !header.equals(PDF_HEADER)) {
      throw new Error(PDF_ONLY_MESSAGE)
    }

    await new Promise<void>((resolve, reject) => {
      output.end((error?: Error | null) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    return {
      size: totalBytes,
      storagePath: target.relativePath.replace(/\\/g, '/'),
    }
  } catch (error) {
    output.destroy()
    await rm(target.absolutePath, { force: true }).catch(() => undefined)
    throw error
  }
}

const parseMultipartRequest = async (req: Request) => {
  const requestUrl = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl || req.url}`
  const requestCtor = (globalThis as typeof globalThis & {
    Request: new (
      input: string,
      init: {
        method: string
        headers: Record<string, string>
        body: unknown
        duplex: 'half'
      }
    ) => {
      formData: () => Promise<{
        get: (name: string) => unknown
      }>
    }
  }).Request

  const webRequest = new requestCtor(requestUrl, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).flatMap(([key, value]) =>
        typeof value === 'string'
          ? [[key, value]]
          : Array.isArray(value)
          ? [[key, value.join(', ')]]
          : []
      )
    ),
    body: req,
    duplex: 'half',
  })

  return await webRequest.formData()
}

const isPdfFile = (type: string, fileName: string, buffer: Buffer) => {
  const normalizedType = type.trim().toLowerCase()
  const isMimePdf = normalizedType === 'application/pdf'
  const isPdfHeader = buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  const isPdfExtension = fileName.trim().toLowerCase().endsWith('.pdf')
  return isMimePdf && isPdfHeader && isPdfExtension
}

export const listEmployerContractFiles = async (_req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(_req)
    const files = await getEmployerContractFilesStore(agencyId)
    res.status(200).json({
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        category: f.category,
        refCode: f.refCode,
        createdAt: f.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching contract files:', error)
    res.status(500).json({ error: 'Failed to fetch contract files' })
  }
}

export const uploadEmployerContractFiles = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const contentType = String(req.headers['content-type'] ?? '')
    if (/multipart\/form-data/i.test(contentType)) {
      const formData = await parseMultipartRequest(req)
      const uploadedFile = formData.get('file')
      const category = String(formData.get('category') ?? '').trim()
      const refCode = String(formData.get('refCode') ?? '').trim()

      if (
        !uploadedFile ||
        typeof uploadedFile !== 'object' ||
        typeof (uploadedFile as { name?: unknown }).name !== 'string' ||
        typeof (uploadedFile as { stream?: unknown }).stream !== 'function'
      ) {
        return res.status(400).json({ error: 'file is required' })
      }
      if (!category) {
        return res.status(400).json({ error: 'category is required' })
      }
      if (!refCode) {
        return res.status(400).json({ error: 'refCode is required' })
      }

      const file = uploadedFile as {
        name: string
        type: string
        size?: number
        stream: () => unknown
      }

      if (!file.name.trim()) {
        return res.status(400).json({ error: 'Invalid file payload' })
      }

      const [saved] = await addEmployerContractFilesStore([
        await (async () => {
          const persisted = await streamMultipartPdfToDisk(file, agencyId, refCode)
          return {
            name: file.name,
            size: persisted.size,
            type: file.type || 'application/pdf',
            dataBase64: '',
            storagePath: persisted.storagePath,
            category,
            refCode,
          }
        })(),
      ], agencyId)

      return res.status(200).json({
        fileUrl: `/api/employer-files/${saved.id}/view`,
        fileName: saved.name,
        category,
      })
    }

    const { files } = req.body as {
      files?: Array<{
        name?: string
        size?: number
        type?: string
        dataBase64?: string
        category?: string
        refCode?: string
      }>
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files is required' })
    }
    if (files.length > MAX_FILES) {
      return res.status(400).json({ error: `Max ${MAX_FILES} files` })
    }

    const normalized = files.map((file) => ({
      name: String(file.name ?? ''),
      size: Number(file.size ?? 0) || 0,
      type: String(file.type ?? ''),
      dataBase64: normalizeBase64(String(file.dataBase64 ?? '')),
      category: String(file.category ?? ''),
      refCode: String(file.refCode ?? ''),
    }))
    const validatedFiles: Array<{
      name: string
      size: number
      type: string
      dataBase64: string
      category: string
      refCode: string
    }> = []

    for (const f of normalized) {
      if (!f.name || !f.size || !f.dataBase64) {
        return res.status(400).json({ error: 'Invalid file payload' })
      }
      if (!/^[A-Za-z0-9+/=]+$/.test(f.dataBase64)) {
        return res.status(400).json({ error: 'Invalid base64 data' })
      }
      const buffer = Buffer.from(f.dataBase64, 'base64')
      if (!buffer.length) {
        return res.status(400).json({ error: 'Invalid file payload' })
      }
      if (buffer.length > MAX_BYTES_PER_FILE) {
        return res.status(400).json({ error: FILE_SIZE_LIMIT_MESSAGE })
      }
      if (!isPdfFile(f.type, f.name, buffer)) {
        return res.status(400).json({ error: PDF_ONLY_MESSAGE })
      }
      validatedFiles.push({
        ...f,
        size: buffer.length,
      })
    }

    const saved = await addEmployerContractFilesStore(validatedFiles, agencyId)
    res.status(200).json({
      files: saved.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        category: f.category,
        refCode: f.refCode,
        createdAt: f.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error uploading contract files:', error)
    const message = error instanceof Error ? error.message : ''
    if (message === PDF_ONLY_MESSAGE) {
      return res.status(400).json({ error: PDF_ONLY_MESSAGE })
    }
    if (message === FILE_SIZE_LIMIT_MESSAGE) {
      return res.status(413).json({ error: FILE_SIZE_LIMIT_MESSAGE })
    }
    res.status(500).json({ error: 'Failed to upload contract files' })
  }
}

const sendEmployerContractFile = async (
  req: Request,
  res: Response,
  disposition: 'attachment' | 'inline'
) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
    const file = await getEmployerContractFileStore(id, agencyId)
    if (!file) return res.status(404).json({ error: 'File not found' })
    const buffer = file.storagePath
      ? await readFile(path.join(uploadsRoot, file.storagePath))
      : Buffer.from(file.dataBase64, 'base64')
    const safeFileName = file.name.replace(new RegExp(escapeRegExp('"'), 'g'), '')
    res.status(200)
      .setHeader('Content-Type', file.type || 'application/octet-stream')
      .setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`)
      .send(buffer)
  } catch (error) {
    console.error('Error serving contract file:', error)
    res.status(500).json({ error: 'Failed to serve contract file' })
  }
}

export const viewEmployerContractFile = async (req: Request, res: Response) =>
  sendEmployerContractFile(req, res, 'inline')

export const downloadEmployerContractFile = async (req: Request, res: Response) =>
  sendEmployerContractFile(req, res, 'attachment')

export const deleteEmployerContractFile = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
    const deleted = await deleteEmployerContractFileStore(id, agencyId)
    if (!deleted) return res.status(404).json({ error: 'File not found' })
    res.status(200).json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error deleting contract file:', error)
    res.status(500).json({ error: 'Failed to delete contract file' })
  }
}
