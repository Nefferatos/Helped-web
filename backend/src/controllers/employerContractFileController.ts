import { Request, Response } from 'express'
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

const normalizeBase64 = (value: string) => value.replace(/\s+/g, '')

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isPdfFile = (type: string, fileName: string, buffer: Buffer) => {
  const normalizedType = type.trim().toLowerCase()
  const isMimePdf = normalizedType === 'application/pdf'
  const isPdfHeader = buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  const isPdfExtension = fileName.trim().toLowerCase().endsWith('.pdf')
  return isMimePdf && isPdfHeader && isPdfExtension
}

const parseMultipartFormData = (req: Request) => {
  const contentType = String(req.headers['content-type'] ?? '')
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2]
  if (!boundary) {
    throw new Error('Missing multipart boundary')
  }

  const bodyBuffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from([])
  if (!bodyBuffer.length) {
    throw new Error('Empty upload body')
  }

  const body = bodyBuffer.toString('latin1')
  const boundaryText = `--${boundary}`
  const parts = body.split(boundaryText).slice(1, -1)

  const fields: Record<string, string> = {}
  const files: Array<{
    fieldName: string
    fileName: string
    type: string
    buffer: Buffer
  }> = []

  for (const rawPart of parts) {
    const trimmed = rawPart.replace(/^\r\n/, '').replace(/\r\n$/, '')
    if (!trimmed) continue

    const headerEnd = trimmed.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue

    const headerText = trimmed.slice(0, headerEnd)
    const contentText = trimmed.slice(headerEnd + 4)
    const dispositionMatch = headerText.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i)
    if (!dispositionMatch) continue

    const fieldName = dispositionMatch[1]
    const fileName = dispositionMatch[2]
    const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i)

    if (typeof fileName === 'string') {
      const contentBuffer = Buffer.from(contentText, 'latin1')
      files.push({
        fieldName,
        fileName,
        type: String(typeMatch?.[1] ?? 'application/octet-stream').trim(),
        buffer: contentBuffer,
      })
      continue
    }

    fields[fieldName] = contentText
  }

  return { fields, files }
}

export const listEmployerContractFiles = async (_req: Request, res: Response) => {
  try {
    const files = await getEmployerContractFilesStore()
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
    const contentType = String(req.headers['content-type'] ?? '')
    if (/multipart\/form-data/i.test(contentType)) {
      const { fields, files } = parseMultipartFormData(req)
      const file = files.find((item) => item.fieldName === 'file') ?? files[0]
      const category = String(fields.category ?? '').trim()
      const refCode = String(fields.refCode ?? '').trim()

      if (!file) {
        return res.status(400).json({ error: 'file is required' })
      }
      if (!category) {
        return res.status(400).json({ error: 'category is required' })
      }
      if (!refCode) {
        return res.status(400).json({ error: 'refCode is required' })
      }
      if (!file.fileName || !file.buffer.length) {
        return res.status(400).json({ error: 'Invalid file payload' })
      }
      if (!isPdfFile(file.type, file.fileName, file.buffer)) {
        return res.status(400).json({ error: PDF_ONLY_MESSAGE })
      }
      if (file.buffer.length > MAX_BYTES_PER_FILE) {
        return res.status(400).json({ error: FILE_SIZE_LIMIT_MESSAGE })
      }

      const [saved] = await addEmployerContractFilesStore([
        {
          name: file.fileName,
          size: file.buffer.length,
          type: file.type,
          dataBase64: file.buffer.toString('base64'),
          category,
          refCode,
        },
      ])

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

    const saved = await addEmployerContractFilesStore(validatedFiles)
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
    res.status(500).json({ error: 'Failed to upload contract files' })
  }
}

const sendEmployerContractFile = async (
  req: Request,
  res: Response,
  disposition: 'attachment' | 'inline'
) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
    const file = await getEmployerContractFileStore(id)
    if (!file) return res.status(404).json({ error: 'File not found' })
    const buffer = Buffer.from(file.dataBase64, 'base64')
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
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
    const deleted = await deleteEmployerContractFileStore(id)
    if (!deleted) return res.status(404).json({ error: 'File not found' })
    res.status(200).json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error deleting contract file:', error)
    res.status(500).json({ error: 'Failed to delete contract file' })
  }
}
