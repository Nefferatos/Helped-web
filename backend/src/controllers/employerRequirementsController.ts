import type { Request, Response } from 'express'
import { getRequestAgencyId } from '../auth'
import { getEmployerRequirements, upsertEmployerRequirements } from '../services/employerRequirementsService'

const asOptionalString = (value: unknown, maxLength = 2000) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) || null : null

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 20)
    : []

const employerIdFromRequest = (req: Request) => {
  const employerId = Number(req.params.employerId)
  if (!Number.isInteger(employerId) || employerId <= 0) throw new Error('employerId must be a positive integer')
  return employerId
}

export const getRequirements = async (req: Request, res: Response) => {
  try {
    const requirements = await getEmployerRequirements(await getRequestAgencyId(req), employerIdFromRequest(req))
    return res.status(200).json({ requirements })
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to load requirements' })
  }
}

export const saveRequirements = async (req: Request, res: Response) => {
  try {
    const maxSalary = req.body.maxMonthlySalary === undefined ? null : Number(req.body.maxMonthlySalary)
    const minimumExperience = req.body.minimumExperienceYears === undefined ? null : Number(req.body.minimumExperienceYears)
    if (maxSalary !== null && (!Number.isFinite(maxSalary) || maxSalary < 0)) throw new Error('maxMonthlySalary must be a non-negative number')
    if (minimumExperience !== null && (!Number.isInteger(minimumExperience) || minimumExperience < 0)) throw new Error('minimumExperienceYears must be a non-negative integer')

    const requirements = await upsertEmployerRequirements(await getRequestAgencyId(req), employerIdFromRequest(req), {
      service_type: asOptionalString(req.body.serviceType, 120),
      location: asOptionalString(req.body.location, 200),
      max_monthly_salary: maxSalary,
      availability: asOptionalString(req.body.availability, 120),
      preferred_nationalities: asStringArray(req.body.preferredNationalities),
      preferred_languages: asStringArray(req.body.preferredLanguages),
      minimum_experience_years: minimumExperience,
      notes: asOptionalString(req.body.notes, 5000),
    })
    return res.status(200).json({ requirements })
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save requirements' })
  }
}
