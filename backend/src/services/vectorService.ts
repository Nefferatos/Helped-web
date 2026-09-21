import { MaidRecord, getMaidsStore } from '../store'
import { MatchCriteria } from '../types/workflow'
import { query, sql } from '../db'
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

export interface KnowledgeSnippet {
  id: string
  title: string
  category: string
  content: string
  similarity: number
  sourceKey: string
}

const KNOWLEDGE_COLLECTION = 'agency_knowledge'

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

const splitKnowledgeContent = (content: string, size = 900) => {
  const normalized = normalizeWhitespace(content)
  const chunks: string[] = []
  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size))
  }
  return chunks.filter(Boolean)
}

/** Stores SOP/FAQ/MOM text in its own collection; it never participates in maid matching. */
export const indexKnowledgeDocument = async (input: {
  agencyId: number
  sourceKey: string
  title: string
  category: 'SOP' | 'FAQ' | 'MOM'
  content: string
  metadata?: Record<string, unknown>
}) => {
  const result = await query(sql`
    INSERT INTO knowledge_documents (agency_id, collection, source_key, title, category, content, metadata, active)
    VALUES (${input.agencyId}, ${KNOWLEDGE_COLLECTION}, ${input.sourceKey}, ${input.title}, ${input.category}, ${input.content}, ${JSON.stringify(input.metadata ?? {})}::jsonb, TRUE)
    ON CONFLICT (agency_id, collection, source_key) DO UPDATE SET
      title = EXCLUDED.title, category = EXCLUDED.category, content = EXCLUDED.content,
      metadata = EXCLUDED.metadata, active = TRUE, updated_at = NOW()
    RETURNING id
  `)
  const documentId = result.rows[0]?.id as string
  await query(sql`DELETE FROM knowledge_chunks WHERE document_id = ${documentId}`)
  for (const [index, chunk] of splitKnowledgeContent(input.content).entries()) {
    await query(sql`
      INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding)
      VALUES (${documentId}, ${index}, ${chunk}, ${JSON.stringify(embedText(chunk))}::jsonb)
    `)
  }
  return documentId
}

export const retrieveKnowledgeSnippets = async (
  agencyId: number,
  searchText: string,
  limit = 4
): Promise<KnowledgeSnippet[]> => {
  const queryVector = embedText(searchText)
  const result = await query(sql`
    SELECT d.id, d.title, d.category, d.source_key, c.content, c.embedding
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE d.agency_id = ${agencyId} AND d.collection = ${KNOWLEDGE_COLLECTION} AND d.active = TRUE
  `)
  return result.rows
    .map((row: { id: string; title: string; category: string; source_key: string; content: string; embedding: unknown }) => {
      const embedding = Array.isArray(row.embedding) ? row.embedding.map(Number) : []
      return { id: row.id, title: row.title, category: row.category, sourceKey: row.source_key, content: row.content, similarity: cosineSimilarity(queryVector, embedding) }
    })
    .filter((snippet: KnowledgeSnippet) => snippet.similarity >= 0.53)
    .sort((left: KnowledgeSnippet, right: KnowledgeSnippet) => right.similarity - left.similarity)
    .slice(0, Math.max(1, Math.min(limit, 10)))
}
