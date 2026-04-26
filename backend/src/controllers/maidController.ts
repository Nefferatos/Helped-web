import { Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin, getRequestAgencyId } from '../auth'
import {
  addMaidPhotoStore,
  createMaidStore,
  deleteMaidStore,
  getAgencyNameByIdStore,
  getAllMaidsStore,
  getMaidByReferenceCodeStore,
  getMaidsStore,
  getPublicMaidByReferenceCodeStore,
  MaidRecord,
  updateMaidPhotoStore,
  updateMaidVideoStore,
  updateMaidStore,
  updateMaidVisibilityStore,
} from '../store'

interface MaidProfile {
  fullName: string
  referenceCode: string
  status?: string
  type: string
  nationality: string
  dateOfBirth: string
  placeOfBirth: string
  height: number
  weight: number
  religion: string
  maritalStatus: string
  numberOfChildren: number
  numberOfSiblings: number
  homeAddress: string
  airportRepatriation: string
  educationLevel: string
  languageSkills: Record<string, string>
  skillsPreferences: Record<string, unknown>
  workAreas: Record<string, unknown>
  employmentHistory: Array<Record<string, unknown>>
  introduction: Record<string, unknown>
  agencyContact: Record<string, unknown>
  photoDataUrl?: string
  photoDataUrls?: string[]
  videoDataUrl?: string
  isPublic?: boolean
  hasPhoto?: boolean
}

const defaultMaidProfile = {
  status: 'available',
  type: 'New maid',
  nationality: 'Filipino maid',
  dateOfBirth: '',
  placeOfBirth: '',
  height: 150,
  weight: 50,
  religion: 'Catholic',
  maritalStatus: 'Single',
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: '',
  airportRepatriation: '',
  educationLevel: 'High School (10-12 yrs)',
  languageSkills: { English: 'Zero' },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: '',
  photoDataUrls: [],
  videoDataUrl: '',
  isPublic: false,
  hasPhoto: false,
}

const csvColumns = [
  'referenceCode',
  'fullName',
  'type',
  'nationality',
  'dateOfBirth',
  'placeOfBirth',
  'height',
  'weight',
  'religion',
  'maritalStatus',
  'numberOfChildren',
  'numberOfSiblings',
  'homeAddress',
  'airportRepatriation',
  'educationLevel',
  'isPublic',
  'hasPhoto',
] as const

const requiredFields: Array<keyof MaidProfile> = [
  'fullName',
  'referenceCode',
  'type',
  'nationality',
  'dateOfBirth',
  'placeOfBirth',
  'height',
  'weight',
  'religion',
  'maritalStatus',
  'numberOfChildren',
  'numberOfSiblings',
  'homeAddress',
  'airportRepatriation',
  'educationLevel',
  'languageSkills',
  'skillsPreferences',
  'workAreas',
  'employmentHistory',
  'introduction',
  'agencyContact',
]

const validateMaidPayload = (maid: Partial<MaidProfile>) => {
  const missingFields = requiredFields.filter((field) => maid[field] === undefined)
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`
  }

  if (!maid.fullName?.trim() || !maid.referenceCode?.trim()) {
    return 'Full name and reference code are required'
  }

  return null
}

const toMaidRecord = (
  maid: MaidProfile
): Omit<MaidRecord, 'id' | 'agencyId' | 'createdAt' | 'updatedAt'> => ({
  fullName: maid.fullName.trim(),
  referenceCode: maid.referenceCode.trim(),
  status: maid.status ?? 'available',
  type: maid.type,
  nationality: maid.nationality,
  dateOfBirth: maid.dateOfBirth,
  placeOfBirth: maid.placeOfBirth,
  height: maid.height,
  weight: maid.weight,
  religion: maid.religion,
  maritalStatus: maid.maritalStatus,
  numberOfChildren: maid.numberOfChildren,
  numberOfSiblings: maid.numberOfSiblings,
  homeAddress: maid.homeAddress,
  airportRepatriation: maid.airportRepatriation,
  educationLevel: maid.educationLevel,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  agencyContact: maid.agencyContact,
  photoDataUrl: maid.photoDataUrl ?? '',
  photoDataUrls:
    (Array.isArray(maid.photoDataUrls)
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : []
    ).slice(0, 5),
  videoDataUrl: maid.videoDataUrl ?? '',
  isPublic: maid.isPublic ?? false,
  hasPhoto:
    maid.hasPhoto ??
    Boolean(
      (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0) ||
        maid.photoDataUrl
    ),
})

const csvEscape = (value: unknown) => {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const parseCsvRow = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const getMaidList = async (req: Request, res: Response) => {
  try {
    const { search, visibility } = req.query
    const requestedAgencyId = Number(req.query.agencyId ?? '')
    const admin = await getAuthenticatedAgencyAdmin(req)
    const shouldUseAllPublic =
      !admin &&
      typeof visibility === 'string' &&
      visibility === 'public' &&
      !Number.isInteger(requestedAgencyId)

    const maids = shouldUseAllPublic
      ? await getAllMaidsStore(
          typeof search === 'string' ? search : undefined,
          typeof visibility === 'string' ? visibility : undefined
        )
      : await getMaidsStore(
          typeof search === 'string' ? search : undefined,
          typeof visibility === 'string' ? visibility : undefined,
          Number.isInteger(requestedAgencyId)
            ? requestedAgencyId
            : await getRequestAgencyId(req)
        )

    const payload = await Promise.all(
      maids.map(async (maid) => ({
        ...maid,
        agencyName: await getAgencyNameByIdStore(maid.agencyId),
      }))
    )
    res.status(200).json({ maids: payload })
  } catch (error) {
    console.error('Error fetching maids:', error)
    res.status(500).json({ error: 'Failed to fetch maids' })
  }
}

export const exportMaidsCsv = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const maids = await getMaidsStore(undefined, undefined, agencyId)
    const header = csvColumns.join(',')
    const rows = maids.map((maid) =>
      [
        maid.referenceCode,
        maid.fullName,
        maid.type,
        maid.nationality,
        maid.dateOfBirth,
        maid.placeOfBirth,
        maid.height,
        maid.weight,
        maid.religion,
        maid.maritalStatus,
        maid.numberOfChildren,
        maid.numberOfSiblings,
        maid.homeAddress,
        maid.airportRepatriation,
        maid.educationLevel,
        maid.isPublic,
        maid.hasPhoto,
      ]
        .map(csvEscape)
        .join(',')
    )

    const csv = [header, ...rows].join('\n')
    const fileDate = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="maids-${fileDate}.csv"`
    )
    res.status(200).send(csv)
  } catch (error) {
    console.error('Error exporting maids CSV:', error)
    res.status(500).json({ error: 'Failed to export maids CSV' })
  }
}

export const exportMaidsXls = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const maids = await getMaidsStore(undefined, undefined, agencyId)
    const header = csvColumns.join(',')
    const rows = maids.map((maid) =>
      [
        maid.referenceCode,
        maid.fullName,
        maid.type,
        maid.nationality,
        maid.dateOfBirth,
        maid.placeOfBirth,
        maid.height,
        maid.weight,
        maid.religion,
        maid.maritalStatus,
        maid.numberOfChildren,
        maid.numberOfSiblings,
        maid.homeAddress,
        maid.airportRepatriation,
        maid.educationLevel,
        maid.isPublic,
        maid.hasPhoto,
      ]
        .map(csvEscape)
        .join(',')
    )

    const csv = [header, ...rows].join('\n')
    const csvBase64 = Buffer.from(csv, 'utf8').toString('base64')

    const fileDate = new Date().toISOString().slice(0, 10)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Maids Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 18px; }
            h1 { font-size: 18px; margin: 0 0 10px; }
            table { width: 100%; border-collapse: collapse; }
            thead th { background: #f3f4f6; font-weight: 700; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
            tbody tr:nth-child(even) { background: #fafafa; }
            .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <!--MAIDS_CSV_BASE64:${csvBase64}-->
          <h1>Maids Export</h1>
          <div class="meta">Generated: ${fileDate}</div>
          <table>
            <thead>
              <tr>
                ${csvColumns.map((col) => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${maids
                .map((maid) => {
                  const values = [
                    maid.referenceCode,
                    maid.fullName,
                    maid.type,
                    maid.nationality,
                    maid.dateOfBirth,
                    maid.placeOfBirth,
                    String(maid.height),
                    String(maid.weight),
                    maid.religion,
                    maid.maritalStatus,
                    String(maid.numberOfChildren),
                    String(maid.numberOfSiblings),
                    maid.homeAddress,
                    maid.airportRepatriation,
                    maid.educationLevel,
                    String(Boolean(maid.isPublic)),
                    String(Boolean(maid.hasPhoto)),
                  ]
                  const escape = (value: unknown) =>
                    String(value ?? '')
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;')
                  return `<tr>${values.map((value) => `<td>${escape(value)}</td>`).join('')}</tr>`
                })
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `.trim()

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="maids-${fileDate}.xls"`
    )
    res.status(200).send(html)
  } catch (error) {
    console.error('Error exporting maids Excel:', error)
    res.status(500).json({ error: 'Failed to export maids Excel' })
  }
}

export const importMaidsCsv = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { csv } = req.body as { csv?: string }
    if (!csv?.trim()) {
      return res.status(400).json({ error: 'CSV content is required' })
    }

    const lines = csv
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must include header and at least one row' })
    }

    const headers = parseCsvRow(lines[0])
    const headerSet = new Set(headers)
    if (!headerSet.has('referenceCode') || !headerSet.has('fullName')) {
      return res.status(400).json({ error: 'CSV must include referenceCode and fullName columns' })
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i += 1) {
      const rowValues = parseCsvRow(lines[i])
      const rowMap = Object.fromEntries(headers.map((h, index) => [h, rowValues[index] ?? '']))
      const referenceCode = (rowMap.referenceCode || '').trim()
      const fullName = (rowMap.fullName || '').trim()

      if (!referenceCode || !fullName) {
        errors.push(`Row ${i + 1}: referenceCode and fullName are required`)
        continue
      }

      const existing = await getMaidByReferenceCodeStore(referenceCode, agencyId)
      const base: MaidRecord | (typeof defaultMaidProfile & { fullName: string; referenceCode: string }) =
        existing ??
        ({
          ...defaultMaidProfile,
          fullName,
          referenceCode,
        } as const)

      const profile: MaidProfile = {
        ...base,
        fullName: fullName || base.fullName,
        referenceCode,
        type: rowMap.type || base.type,
        nationality: rowMap.nationality || base.nationality,
        dateOfBirth: rowMap.dateOfBirth || base.dateOfBirth,
        placeOfBirth: rowMap.placeOfBirth || base.placeOfBirth,
        height: parseNumber(rowMap.height, base.height),
        weight: parseNumber(rowMap.weight, base.weight),
        religion: rowMap.religion || base.religion,
        maritalStatus: rowMap.maritalStatus || base.maritalStatus,
        numberOfChildren: parseNumber(
          rowMap.numberOfChildren,
          base.numberOfChildren
        ),
        numberOfSiblings: parseNumber(
          rowMap.numberOfSiblings,
          base.numberOfSiblings
        ),
        homeAddress: rowMap.homeAddress || base.homeAddress,
        airportRepatriation: rowMap.airportRepatriation || base.airportRepatriation,
        educationLevel: rowMap.educationLevel || base.educationLevel,
        languageSkills: base.languageSkills,
        skillsPreferences: base.skillsPreferences,
        workAreas: base.workAreas,
        employmentHistory: base.employmentHistory,
        introduction: base.introduction,
        agencyContact: base.agencyContact,
        photoDataUrl: existing?.photoDataUrl ?? '',
        photoDataUrls: existing?.photoDataUrls ?? [],
        isPublic: parseBoolean(rowMap.isPublic, base.isPublic),
        hasPhoto: parseBoolean(rowMap.hasPhoto, base.hasPhoto),
      }

      try {
        if (existing) {
          await updateMaidStore(referenceCode, toMaidRecord(profile), agencyId)
          updated += 1
        } else {
          await createMaidStore(toMaidRecord(profile), agencyId)
          created += 1
        }
      } catch (error) {
        errors.push(
          `Row ${i + 1}: ${
            error instanceof Error ? error.message : 'Failed to save maid record'
          }`
        )
      }
    }

    const statusCode = errors.length > 0 ? 207 : 200
    res.status(statusCode).json({
      message: 'CSV import completed',
      created,
      updated,
      failed: errors.length,
      errors,
    })
  } catch (error) {
    console.error('Error importing maids CSV:', error)
    res.status(500).json({ error: 'Failed to import maids CSV' })
  }
}

export const getMaidByReferenceCode = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const requestedAgencyId = Number(req.query.agencyId ?? '')
    const referenceCode = String(req.params.referenceCode ?? '').trim()
    const result = Number.isInteger(requestedAgencyId)
      ? await getMaidByReferenceCodeStore(referenceCode, requestedAgencyId)
      : admin
      ? await getMaidByReferenceCodeStore(referenceCode, admin.agencyId)
      : await getPublicMaidByReferenceCodeStore(referenceCode)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({
      maid: {
        ...result,
        agencyName: await getAgencyNameByIdStore(result.agencyId),
      },
    })
  } catch (error) {
    console.error('Error fetching maid:', error)
    res.status(500).json({ error: 'Failed to fetch maid' })
  }
}

export const createMaid = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const maid = req.body as Partial<MaidProfile>
    const payload = {
      ...maid,
      isPublic: maid.isPublic ?? true,
    } as Partial<MaidProfile>
    const validationError = validateMaidPayload(payload)

    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const created = await createMaidStore(toMaidRecord(payload as MaidProfile), agencyId)
    res.status(201).json({ maid: created })
  } catch (error) {
    if (error instanceof Error && error.message === 'REFERENCE_CODE_EXISTS') {
      return res.status(409).json({ error: 'Reference code already exists' })
    }
    console.error('Error creating maid:', error)
    res.status(500).json({ error: 'Failed to create maid' })
  }
}

export const updateMaid = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const maid = req.body as Partial<MaidProfile>
    const validationError = validateMaidPayload(maid)

    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const existing = await getMaidByReferenceCodeStore(referenceCode, agencyId)
    if (!existing) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    const payload = maid as MaidProfile
    const merged = {
      ...payload,
      status: payload.status !== undefined ? payload.status : existing.status,
      photoDataUrl:
        payload.photoDataUrl !== undefined
          ? payload.photoDataUrl
          : existing.photoDataUrl,
      photoDataUrls: Array.isArray(payload.photoDataUrls)
        ? payload.photoDataUrls.slice(0, 5)
        : existing.photoDataUrls,
      videoDataUrl:
        payload.videoDataUrl !== undefined
          ? payload.videoDataUrl
          : existing.videoDataUrl,
      hasPhoto:
        payload.photoDataUrl !== undefined || Array.isArray(payload.photoDataUrls)
          ? Boolean(
              (Array.isArray(payload.photoDataUrls) && payload.photoDataUrls.length > 0) ||
                payload.photoDataUrl
            )
          : existing.hasPhoto,
    }

    const result = await updateMaidStore(referenceCode, toMaidRecord(merged), agencyId)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    if (error instanceof Error && error.message === 'REFERENCE_CODE_EXISTS') {
      return res.status(409).json({ error: 'Reference code already exists' })
    }
    console.error('Error updating maid:', error)
    res.status(500).json({ error: 'Failed to update maid' })
  }
}

export const updateMaidVisibility = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const { isPublic } = req.body as { isPublic?: boolean }

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic boolean is required' })
    }

    const result = await updateMaidVisibilityStore(referenceCode, isPublic, agencyId)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    console.error('Error updating maid visibility:', error)
    res.status(500).json({ error: 'Failed to update maid visibility' })
  }
}

export const updateMaidPhoto = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const { photoDataUrl } = req.body as { photoDataUrl?: string }
    if (typeof photoDataUrl !== 'string') {
      return res.status(400).json({ error: 'photoDataUrl string is required' })
    }

    const result = await updateMaidPhotoStore(referenceCode, photoDataUrl, agencyId)
    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    console.error('Error updating maid photo:', error)
    res.status(500).json({ error: 'Failed to update maid photo' })
  }
}

export const addMaidPhoto = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const { photoDataUrl } = req.body as { photoDataUrl?: string }
    if (typeof photoDataUrl !== 'string' || !photoDataUrl.trim()) {
      return res.status(400).json({ error: 'photoDataUrl string is required' })
    }

    const result = await addMaidPhotoStore(referenceCode, photoDataUrl, agencyId)
    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    if (error instanceof Error && error.message === 'PHOTO_LIMIT_REACHED') {
      return res.status(400).json({ error: 'Maximum 5 photos allowed per maid' })
    }
    console.error('Error adding maid photo:', error)
    res.status(500).json({ error: 'Failed to add maid photo' })
  }
}

export const updateMaidVideo = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const { videoDataUrl } = req.body as { videoDataUrl?: string }
    if (typeof videoDataUrl !== 'string') {
      return res.status(400).json({ error: 'videoDataUrl string is required' })
    }

    const result = await updateMaidVideoStore(referenceCode, videoDataUrl, agencyId)
    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    console.error('Error updating maid video:', error)
    res.status(500).json({ error: 'Failed to update maid video' })
  }
}

export const deleteMaid = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { referenceCode } = req.params
    const result = await deleteMaidStore(referenceCode, agencyId)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ message: 'Maid deleted successfully' })
  } catch (error) {
    console.error('Error deleting maid:', error)
    res.status(500).json({ error: 'Failed to delete maid' })
  }
}
