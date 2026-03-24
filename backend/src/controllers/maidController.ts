import { Request, Response } from 'express'
import {
  createMaidStore,
  deleteMaidStore,
  getMaidByReferenceCodeStore,
  getMaidsStore,
  MaidRecord,
  updateMaidStore,
  updateMaidVisibilityStore,
} from '../store'

interface MaidProfile {
  fullName: string
  referenceCode: string
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
  isPublic?: boolean
  hasPhoto?: boolean
}

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
): Omit<MaidRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  fullName: maid.fullName,
  referenceCode: maid.referenceCode,
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
  isPublic: maid.isPublic ?? false,
  hasPhoto: maid.hasPhoto ?? false,
})

export const getMaidList = async (req: Request, res: Response) => {
  try {
    const { search, visibility } = req.query
    const maids = await getMaidsStore(
      typeof search === 'string' ? search : undefined,
      typeof visibility === 'string' ? visibility : undefined
    )
    res.status(200).json({ maids })
  } catch (error) {
    console.error('Error fetching maids:', error)
    res.status(500).json({ error: 'Failed to fetch maids' })
  }
}

export const getMaidByReferenceCode = async (req: Request, res: Response) => {
  try {
    const { referenceCode } = req.params
    const result = await getMaidByReferenceCodeStore(referenceCode)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    console.error('Error fetching maid:', error)
    res.status(500).json({ error: 'Failed to fetch maid' })
  }
}

export const createMaid = async (req: Request, res: Response) => {
  try {
    const maid = req.body as Partial<MaidProfile>
    const validationError = validateMaidPayload(maid)

    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const created = await createMaidStore(toMaidRecord(maid as MaidProfile))
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
    const { referenceCode } = req.params
    const maid = req.body as Partial<MaidProfile>
    const validationError = validateMaidPayload(maid)

    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const result = await updateMaidStore(
      referenceCode,
      toMaidRecord(maid as MaidProfile)
    )

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
    const { referenceCode } = req.params
    const { isPublic } = req.body as { isPublic?: boolean }

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic boolean is required' })
    }

    const result = await updateMaidVisibilityStore(referenceCode, isPublic)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ maid: result })
  } catch (error) {
    console.error('Error updating maid visibility:', error)
    res.status(500).json({ error: 'Failed to update maid visibility' })
  }
}

export const deleteMaid = async (req: Request, res: Response) => {
  try {
    const { referenceCode } = req.params
    const result = await deleteMaidStore(referenceCode)

    if (!result) {
      return res.status(404).json({ error: 'Maid not found' })
    }

    res.status(200).json({ message: 'Maid deleted successfully' })
  } catch (error) {
    console.error('Error deleting maid:', error)
    res.status(500).json({ error: 'Failed to delete maid' })
  }
}
