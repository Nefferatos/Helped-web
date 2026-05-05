import { MaidRecord, getMaidsStore } from '../store'
import { MatchCriteria } from '../types/workflow'
import {
  extractBudgetFromText,
  extractLocationFromText,
  normalizeLocation,
  normalizeServiceType,
  normalizeUrgency,
  normalizeWhitespace,
} from './workflowNormalizationService'

const VECTOR_DIMENSIONS = 64

export interface VectorQueryProfile {
  message: string
  serviceType: string
  location: string
  urgency: string
  budgetText: string
}

export interface VectorMatchCandidate {
  maid: MaidRecord
  similarity: number
  vector: number[]
  document: string
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const tokenize = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

const hashToken = (token: string) => {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

const normalizeVector = (vector: number[]) => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (!magnitude) {
    return vector
  }
  return vector.map((value) => value / magnitude)
}

export const embedText = (value: string) => {
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0)

  for (const token of tokenize(value)) {
    const hash = hashToken(token)
    const slot = hash % VECTOR_DIMENSIONS
    const direction = hash % 2 === 0 ? 1 : -1
    vector[slot] += direction
  }

  return normalizeVector(vector)
}

export const cosineSimilarity = (left: number[], right: number[]) => {
  if (left.length !== right.length || left.length === 0) {
    return 0
  }

  let score = 0
  for (let index = 0; index < left.length; index += 1) {
    score += left[index] * right[index]
  }
  return clamp((score + 1) / 2)
}

const buildMaidDocument = (maid: MaidRecord) =>
  normalizeWhitespace(
    JSON.stringify({
      fullName: maid.fullName,
      referenceCode: maid.referenceCode,
      nationality: maid.nationality,
      type: maid.type,
      status: maid.status,
      homeAddress: maid.homeAddress,
      introduction: maid.introduction,
      skillsPreferences: maid.skillsPreferences,
      workAreas: maid.workAreas,
      employmentHistory: maid.employmentHistory,
      languageSkills: maid.languageSkills,
      agencyContact: maid.agencyContact,
    })
  )

export const buildVectorQueryProfile = (criteria: MatchCriteria): VectorQueryProfile => {
  const message = normalizeWhitespace(criteria.message ?? '')
  const budget = criteria.budget?.text || criteria.salary?.text || extractBudgetFromText(message).text
  const location = normalizeLocation(criteria.location || extractLocationFromText(message))

  return {
    message,
    serviceType: normalizeServiceType(criteria.serviceType ?? message),
    location,
    urgency: normalizeUrgency(criteria.availability ?? message),
    budgetText: budget,
  }
}

export const retrieveSemanticMaids = async (
  criteria: MatchCriteria,
  limit = 12
): Promise<{
  queryProfile: VectorQueryProfile
  candidates: VectorMatchCandidate[]
  vectorUsed: boolean
}> => {
  const maids = await getMaidsStore()
  const queryProfile = buildVectorQueryProfile(criteria)
  const queryText = normalizeWhitespace(
    [
      queryProfile.message,
      queryProfile.serviceType,
      queryProfile.location,
      queryProfile.urgency,
      queryProfile.budgetText,
    ].join(' ')
  )

  const queryVector = embedText(queryText)
  const candidates = maids
    .map((maid) => {
      const document = buildMaidDocument(maid)
      const vector = embedText(document)
      const similarity = cosineSimilarity(queryVector, vector)
      return { maid, similarity, vector, document }
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)

  return {
    queryProfile,
    candidates,
    vectorUsed: queryText.length > 0,
  }
}
