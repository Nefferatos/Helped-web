import { query, sql } from '../db'
import type { MatchCriteria } from '../types/workflow'

type RequirementRow = {
  employer_id: number
  service_type: string | null
  location: string | null
  max_monthly_salary: string | number | null
  availability: string | null
  preferred_nationalities: string[] | null
  preferred_languages: string[] | null
  minimum_experience_years: number | null
  notes: string | null
}

export type EmployerRequirementsInput = Omit<RequirementRow, 'employer_id'>

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []

export const getEmployerRequirements = async (agencyId: number, employerId: number) => {
  const result = await query(sql`
    SELECT employer_id, service_type, location, max_monthly_salary, availability,
           preferred_nationalities, preferred_languages, minimum_experience_years, notes
    FROM employer_requirements
    WHERE agency_id = ${agencyId} AND employer_id = ${employerId} AND active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1
  `)
  return (result.rows[0] as RequirementRow | undefined) ?? null
}

export const upsertEmployerRequirements = async (
  agencyId: number,
  employerId: number,
  input: EmployerRequirementsInput
) => {
  const result = await query(sql`
    INSERT INTO employer_requirements (
      agency_id, employer_id, service_type, location, max_monthly_salary, availability,
      preferred_nationalities, preferred_languages, minimum_experience_years, notes, active
    ) VALUES (
      ${agencyId}, ${employerId}, ${input.service_type ?? null}, ${input.location ?? null},
      ${input.max_monthly_salary ?? null}, ${input.availability ?? null},
      ${asStringArray(input.preferred_nationalities)}, ${asStringArray(input.preferred_languages)},
      ${input.minimum_experience_years ?? null}, ${input.notes ?? null}, TRUE
    ) ON CONFLICT (agency_id, employer_id) DO UPDATE SET
      service_type = EXCLUDED.service_type, location = EXCLUDED.location,
      max_monthly_salary = EXCLUDED.max_monthly_salary, availability = EXCLUDED.availability,
      preferred_nationalities = EXCLUDED.preferred_nationalities, preferred_languages = EXCLUDED.preferred_languages,
      minimum_experience_years = EXCLUDED.minimum_experience_years, notes = EXCLUDED.notes,
      active = TRUE, updated_at = NOW()
    RETURNING *
  `)
  return result.rows[0]
}

/** Merge saved employer requirements over ad-hoc input so matching is repeatable. */
export const applyEmployerRequirements = async (criteria: MatchCriteria): Promise<MatchCriteria> => {
  if (!criteria.employerId || !criteria.agencyId) return criteria
  const saved = await getEmployerRequirements(criteria.agencyId, criteria.employerId).catch(() => null)
  if (!saved) return criteria

  const cap = Number(saved.max_monthly_salary)
  return {
    ...criteria,
    serviceType: saved.service_type || criteria.serviceType,
    location: saved.location || criteria.location,
    availability: saved.availability || criteria.availability,
    salary: Number.isFinite(cap) && cap > 0
      ? { min: criteria.salary?.min ?? null, max: cap, currency: criteria.salary?.currency ?? 'SGD', text: `SGD ${cap}` }
      : criteria.salary,
    preferredNationalities: asStringArray(saved.preferred_nationalities),
    preferredLanguages: asStringArray(saved.preferred_languages),
    minimumExperienceYears: saved.minimum_experience_years ?? undefined,
    message: [criteria.message, saved.notes].filter(Boolean).join('\n'),
  }
}
