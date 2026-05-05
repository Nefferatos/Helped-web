import { MaidRecord } from '../store'
import { MatchCandidate, MatchCriteria } from '../types/workflow'
import { rankMatchesWithAi } from '../services/workflowAiService'
import {
  extractBudgetFromText,
  normalizeLocation,
  normalizeServiceType,
  normalizeUrgency,
} from '../services/workflowNormalizationService'
import { retrieveSemanticMaids } from '../services/vectorService'

type ScreenedCriteria = {
  serviceType: string
  location: string
  budget: ReturnType<typeof extractBudgetFromText>
  salary: ReturnType<typeof extractBudgetFromText>
  availability: string
  message: string
  employerId?: number
  leadId?: number
  inquiryId?: number
}

const coerceString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

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

const normalizeCriteria = (criteria: MatchCriteria): ScreenedCriteria => ({
  ...criteria,
  message: coerceString(criteria.message),
  serviceType: normalizeServiceType(criteria.serviceType ?? criteria.message ?? ''),
  location: normalizeLocation(criteria.location ?? ''),
  budget: criteria.budget ?? extractBudgetFromText(criteria.message ?? ''),
  salary: criteria.salary ?? extractBudgetFromText(criteria.message ?? ''),
  availability: normalizeUrgency(criteria.availability ?? criteria.message ?? ''),
})

const missingFields = (criteria: ScreenedCriteria) =>
  ['serviceType'].filter((field) => !criteria[field as keyof ScreenedCriteria])

const complianceValidation = (maid: MaidRecord, criteria: ScreenedCriteria) => {
  const issues: string[] = []
  const maidSalary = extractSalaryFromMaid(maid)
  const salaryCap = criteria.salary.max ?? criteria.budget.max ?? null
  const availability = extractAvailabilityFromMaid(maid)

  if (maid.status && /rejected|inactive|blacklist/i.test(maid.status)) {
    issues.push('maid_status_restricted')
  }

  if (salaryCap != null && maidSalary != null && maidSalary > salaryCap) {
    issues.push('salary_exceeds_budget')
  }

  if (
    criteria.availability === 'high' &&
    !availability.includes('available') &&
    !availability.includes('immediately') &&
    !availability.includes('transfer')
  ) {
    issues.push('availability_mismatch')
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

const scoreStructuredCompatibility = (
  maid: MaidRecord,
  criteria: ScreenedCriteria,
  similarity: number
): MatchCandidate => {
  const reasons: string[] = []
  let score = Math.round(similarity * 55)
  const maidService = maidServiceProfile(maid)
  const maidLocation = extractLocationFromMaid(maid)
  const maidSalary = extractSalaryFromMaid(maid)
  const salaryCap = criteria.salary.max ?? criteria.budget.max ?? null
  const availability = extractAvailabilityFromMaid(maid)

  if (maid.status === 'available') {
    score += 12
    reasons.push('Currently available')
  }

  if (availability.includes('transfer') || availability.includes('immediately')) {
    score += 8
    reasons.push('Fast deployment potential')
  }

  if (maidService === criteria.serviceType) {
    score += 15
    reasons.push(`Experience aligned with ${criteria.serviceType.replace(/_/g, ' ')}`)
  }

  if (
    criteria.location &&
    maidLocation &&
    (maidLocation.includes(criteria.location) || criteria.location.includes(maidLocation))
  ) {
    score += 8
    reasons.push(`Location fit for ${criteria.location}`)
  }

  if (salaryCap != null && maidSalary != null && maidSalary <= salaryCap) {
    score += 8
    reasons.push('Salary expectation fits budget')
  }

  if (maid.languageSkills && Object.keys(maid.languageSkills).length > 0) {
    score += 4
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

export const runSemanticMatchingAgent = async (criteria: MatchCriteria) => {
  const normalized = normalizeCriteria(criteria)
  const requiredMissingFields = missingFields(normalized)
  const retrieval = await retrieveSemanticMaids(criteria, 14)

  const filtered = retrieval.candidates
    .map((candidate) => {
      const compliance = complianceValidation(candidate.maid, normalized)
      if (!compliance.passed) {
        return null
      }

      const scored = scoreStructuredCompatibility(
        candidate.maid,
        normalized,
        candidate.similarity
      )
      return scored
    })
    .filter((candidate): candidate is MatchCandidate => Boolean(candidate))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)

  const ranked = await rankMatchesWithAi(normalized, filtered)

  return {
    screening: {
      valid: requiredMissingFields.length === 0,
      missingFields: requiredMissingFields,
      normalized,
    },
    vectorSearch: {
      used: retrieval.vectorUsed,
      candidateCount: retrieval.candidates.length,
    },
    aiUsed: ranked.aiUsed,
    fallbackUsed: !ranked.aiUsed,
    matches: ranked.data.slice(0, 3),
  }
}
