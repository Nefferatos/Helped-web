import { MaidRecord, getMaidsStore } from '../store'
import { createWorkflowMatchRecordsStore } from '../store/workflowStore'
import { MatchCandidate, MatchCriteria } from '../types/workflow'
import { rankMatchesWithAi } from './workflowAiService'
import {
  BudgetRange,
} from '../types/workflow'
import {
  extractBudgetFromText,
  normalizeLocation,
  normalizeServiceType,
  normalizeUrgency,
} from './workflowNormalizationService'

const coerceString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const parseBudgetLike = (value: unknown): BudgetRange => {
  if (!value || typeof value !== 'object') {
    return extractBudgetFromText('')
  }

  const raw = value as Partial<BudgetRange>
  return {
    min: Number.isFinite(Number(raw.min)) ? Number(raw.min) : null,
    max: Number.isFinite(Number(raw.max)) ? Number(raw.max) : null,
    currency: coerceString(raw.currency) || 'SGD',
    text: coerceString(raw.text),
  }
}

const extractNestedString = (
  source: Record<string, unknown> | undefined,
  keys: string[]
) => {
  if (!source) return ''
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const extractSalaryFromMaid = (maid: MaidRecord): number | null => {
  const introduction = maid.introduction as Record<string, unknown> | undefined
  const agencyContact = maid.agencyContact as Record<string, unknown> | undefined
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown> | undefined

  const raw =
    extractNestedString(introduction, ['expectedSalary', 'salary']) ||
    extractNestedString(agencyContact, ['salaryOffer', 'expectedSalary']) ||
    extractNestedString(skillsPreferences, ['salary', 'expectedSalary'])

  const matched = raw.match(/\d[\d,]*/)
  if (!matched) return null

  const parsed = Number(matched[0].replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const extractAvailabilityFromMaid = (maid: MaidRecord) => {
  const introduction = maid.introduction as Record<string, unknown> | undefined
  const availability =
    extractNestedString(introduction, ['availability', 'availabilityRemark']) ||
    maid.status ||
    'unknown'
  return availability.toLowerCase()
}

const extractLocationFromMaid = (maid: MaidRecord) => {
  const introduction = maid.introduction as Record<string, unknown> | undefined
  const agencyContact = maid.agencyContact as Record<string, unknown> | undefined
  return normalizeLocation(
    extractNestedString(introduction, ['preferredLocation', 'location']) ||
      extractNestedString(agencyContact, ['location']) ||
      maid.homeAddress ||
      ''
  )
}

const maidServiceProfile = (maid: MaidRecord) => {
  const text = JSON.stringify({
    skillsPreferences: maid.skillsPreferences,
    workAreas: maid.workAreas,
    introduction: maid.introduction,
    employmentHistory: maid.employmentHistory,
    type: maid.type,
  }).toLowerCase()

  if (/(infant|baby|child)/.test(text)) return 'childcare'
  if (/(elderly|disabled|bedridden)/.test(text)) return 'eldercare'
  if (/(cook|cooking)/.test(text)) return 'cooking'
  return 'general_housekeeping'
}

export const screenMatchRequirements = (criteria: MatchCriteria) => {
  const normalized = {
    ...criteria,
    serviceType: normalizeServiceType(criteria.serviceType ?? criteria.message ?? ''),
    location: normalizeLocation(criteria.location ?? ''),
    budget: criteria.budget ? parseBudgetLike(criteria.budget) : extractBudgetFromText(criteria.message ?? ''),
    salary: criteria.salary ? parseBudgetLike(criteria.salary) : extractBudgetFromText(criteria.message ?? ''),
    availability: normalizeUrgency(criteria.availability ?? ''),
  }

  const missingFields = ['serviceType']
    .filter((field) => !normalized[field as keyof typeof normalized])
    .map((field) => field)

  return {
    valid: missingFields.length === 0,
    missingFields,
    normalized,
  }
}

const passesFilters = (maid: MaidRecord, criteria: ReturnType<typeof screenMatchRequirements>['normalized']) => {
  const maidLocation = extractLocationFromMaid(maid).toLowerCase()
  const requestedLocation = (criteria.location ?? '').toLowerCase()
  const maidSalary = extractSalaryFromMaid(maid)
  const salaryCap = criteria.salary?.max ?? criteria.budget?.max ?? null
  const availability = extractAvailabilityFromMaid(maid)

  const locationPass =
    !requestedLocation ||
    requestedLocation === 'singapore' ||
    !maidLocation ||
    maidLocation.includes(requestedLocation) ||
    requestedLocation.includes(maidLocation)

  const salaryPass =
    salaryCap == null || maidSalary == null || maidSalary <= salaryCap

  const availabilityPass =
    availability.includes('available') ||
    availability.includes('immediately') ||
    availability.includes('transfer') ||
    maid.status === 'available'

  return locationPass && salaryPass && availabilityPass
}

const scoreCandidate = (
  maid: MaidRecord,
  criteria: ReturnType<typeof screenMatchRequirements>['normalized']
): MatchCandidate => {
  const reasons: string[] = []
  let score = 50
  const serviceType = criteria.serviceType ?? 'general_housekeeping'
  const maidService = maidServiceProfile(maid)
  const maidLocation = extractLocationFromMaid(maid)
  const maidSalary = extractSalaryFromMaid(maid)
  const salaryCap = criteria.salary?.max ?? criteria.budget?.max ?? null

  if (maid.status === 'available') {
    score += 15
    reasons.push('Currently available')
  }

  if (maidService === serviceType) {
    score += 20
    reasons.push(`Experience aligned with ${serviceType.replace(/_/g, ' ')}`)
  }

  if (criteria.location && maidLocation && maidLocation.includes(criteria.location)) {
    score += 10
    reasons.push(`Location fit for ${criteria.location}`)
  }

  if (salaryCap != null && maidSalary != null && maidSalary <= salaryCap) {
    score += 10
    reasons.push('Salary expectation fits budget')
  }

  if (maid.languageSkills && Object.keys(maid.languageSkills).length > 0) {
    score += 5
    reasons.push('Language profile available')
  }

  return {
    maidId: maid.id,
    maidReferenceCode: maid.referenceCode,
    maidName: maid.fullName,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  }
}

export const runMatchingWorkflow = async (criteria: MatchCriteria) => {
  const screening = screenMatchRequirements(criteria)
  const maids = await getMaidsStore()

  const filtered = maids
    .filter((maid) => passesFilters(maid, screening.normalized))
    .map((maid) => scoreCandidate(maid, screening.normalized))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  const ranked = await rankMatchesWithAi(screening.normalized, filtered)
  const topMatches = ranked.data.slice(0, 3)

  const storedMatches = await createWorkflowMatchRecordsStore(
    topMatches.map((match) => ({
      leadId: criteria.leadId ?? null,
      inquiryId: criteria.inquiryId ?? null,
      employerId: criteria.employerId ?? null,
      maidId: match.maidId,
      maidReferenceCode: match.maidReferenceCode,
      maidName: match.maidName,
      score: match.score,
      reasons: match.reasons,
    }))
  )

  return {
    screening,
    aiUsed: ranked.aiUsed,
    matches: storedMatches,
  }
}
