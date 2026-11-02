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
    const householdSize = req.body.householdSize == null || req.body.householdSize === '' ? null : Number(req.body.householdSize)
    const childrenCount = req.body.childrenCount == null || req.body.childrenCount === '' ? null : Number(req.body.childrenCount)
    const elderlyCount = req.body.elderlyCount == null || req.body.elderlyCount === '' ? null : Number(req.body.elderlyCount)
    const preferredStartDate = asOptionalString(req.body.preferredStartDate, 10)
    if (maxSalary !== null && (!Number.isFinite(maxSalary) || maxSalary < 0)) throw new Error('maxMonthlySalary must be a non-negative number')
    if (minimumExperience !== null && (!Number.isInteger(minimumExperience) || minimumExperience < 0)) throw new Error('minimumExperienceYears must be a non-negative integer')
    if (householdSize !== null && (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 100)) throw new Error('householdSize must be a whole number from 1 to 100')
    if ([childrenCount, elderlyCount].some((count) => count !== null && (!Number.isInteger(count) || count < 0 || count > 100))) throw new Error('childrenCount and elderlyCount must be whole numbers from 0 to 100 when supplied')
    if (preferredStartDate && (!/^\d{4}-\d{2}-\d{2}$/.test(preferredStartDate) || Number.isNaN(Date.parse(`${preferredStartDate}T00:00:00Z`)) || new Date(`${preferredStartDate}T00:00:00Z`).toISOString().slice(0, 10) !== preferredStartDate)) throw new Error('preferredStartDate must be a valid date in YYYY-MM-DD format')

    const requirements = await upsertEmployerRequirements(await getRequestAgencyId(req), employerIdFromRequest(req), {
      service_type: asOptionalString(req.body.serviceType, 120),
      location: asOptionalString(req.body.location, 200),
      max_monthly_salary: maxSalary,
      availability: asOptionalString(req.body.availability, 120),
      preferred_nationalities: asStringArray(req.body.preferredNationalities),
      preferred_languages: asStringArray(req.body.preferredLanguages),
      minimum_experience_years: minimumExperience,
      household_size: householdSize,
      children_count: childrenCount,
      elderly_count: elderlyCount,
      cooking_requirements: asOptionalString(req.body.cookingRequirements, 1000) ?? '',
      preferred_start_date: preferredStartDate,
      notes: asOptionalString(req.body.notes, 5000),
    })
    return res.status(200).json({ requirements })
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save requirements' })
  }
}
