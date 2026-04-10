import { Request, Response } from 'express'
import {
  addEmployerContractFilesStore,
  deleteEmployerContractFileStore,
  getEmployerContractFileStore,
  getEmployerContractFilesStore,
} from '../store'

const MAX_FILES = 10
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024

const normalizeBase64 = (value: string) => value.replace(/\s+/g, '')

export const listEmployerContractFiles = async (_req: Request, res: Response) => {
  try {
    const files = await getEmployerContractFilesStore()
    res.status(200).json({
      files: files.map((f) => ({ id: f.id, name: f.name, size: f.size, type: f.type, createdAt: f.createdAt })),
    })
  } catch (error) {
    console.error('Error fetching contract files:', error)
    res.status(500).json({ error: 'Failed to fetch contract files' })
  }
}

export const uploadEmployerContractFiles = async (req: Request, res: Response) => {
  try {
    const { files } = req.body as {
      files?: Array<{ name?: string; size?: number; type?: string; dataBase64?: string }>
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
    }))

    for (const f of normalized) {
      if (!f.name || !f.size || !f.dataBase64) {
        return res.status(400).json({ error: 'Invalid file payload' })
      }
      if (f.size <= 0 || f.size > MAX_BYTES_PER_FILE) {
        return res.status(400).json({ error: `File too large (max ${MAX_BYTES_PER_FILE} bytes)` })
      }
      if (!/^[A-Za-z0-9+/=]+$/.test(f.dataBase64)) {
        return res.status(400).json({ error: 'Invalid base64 data' })
      }
    }

    const saved = await addEmployerContractFilesStore(normalized)
    res.status(200).json({ files: saved.map((f) => ({ id: f.id, name: f.name, size: f.size, type: f.type, createdAt: f.createdAt })) })
  } catch (error) {
    console.error('Error uploading contract files:', error)
    res.status(500).json({ error: 'Failed to upload contract files' })
  }
}

export const downloadEmployerContractFile = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })
    const file = await getEmployerContractFileStore(id)
    if (!file) return res.status(404).json({ error: 'File not found' })
    const buffer = Buffer.from(file.dataBase64, 'base64')
    res.status(200)
      .setHeader('Content-Type', file.type || 'application/octet-stream')
      .setHeader('Content-Disposition', `attachment; filename="${file.name.replace(/\"/g, '')}"`)
      .send(buffer)
  } catch (error) {
    console.error('Error downloading contract file:', error)
    res.status(500).json({ error: 'Failed to download contract file' })
  }
}

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

