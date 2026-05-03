import {
  BudgetRange,
  InquiryAutomationResult,
  LeadEnrichment,
  LeadQualification,
  MatchCandidate,
  MatchCriteria,
} from '../types/workflow'
import {
  extractBudgetFromText,
  extractLocationFromText,
  normalizeBudget,
  normalizeLocation,
  normalizeServiceType,
  normalizeUrgency,
  normalizeWhitespace,
} from './workflowNormalizationService'

type AiResult<T> = {
  data: T
  aiUsed: boolean
}

const jsonHeaders = {
  'Content-Type': 'application/json',
}

const extractJsonObject = (value: string) => {
  const firstBrace = value.indexOf('{')
  const lastBrace = value.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }
  try {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

const firstDefinedEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return ''
}

const runClaudeJson = async <T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> => {
  const apiKey = firstDefinedEnv(
    'ANTHROPIC_API_KEY',
    'CLAUDE_API_KEY',
    'VITE_CLAUDE_API_KEY'
  )
  if (!apiKey) {
    console.warn('[workflowAiService] Claude API key is missing; using fallback rules')
    return null
  }

  const model =
    firstDefinedEnv(
      'ANTHROPIC_MODEL',
      'CLAUDE_MODEL',
      'VITE_CLAUDE_MODEL'
    ) || 'claude-3-5-haiku-latest'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        system: `${systemPrompt} Return only a valid JSON object.`,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.warn(
        `[workflowAiService] Claude request failed with ${response.status}: ${errorText.slice(0, 500)}`
      )
      return null
    }

    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
    }
    const content =
      body.content
        ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n') ?? ''
    return extractJsonObject(content) as T | null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[workflowAiService] Claude request threw: ${message}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const runGeminiJson = async <T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> => {
  const apiKey = firstDefinedEnv(
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'VITE_GEMINI_API_KEY'
  )
  if (!apiKey) {
    console.warn('[workflowAiService] Gemini API key is missing; cannot use Gemini fallback')
    return null
  }

  const model =
    firstDefinedEnv(
      'GEMINI_MODEL',
      'GOOGLE_MODEL',
      'VITE_GEMINI_MODEL'
    ) || 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          ...jsonHeaders,
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\nReturn only a valid JSON object.\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.warn(
        `[workflowAiService] Gemini request failed with ${response.status}: ${errorText.slice(0, 500)}`
      )
      return null
    }

    const body = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }
    const content =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('\n') ?? ''
    return extractJsonObject(content) as T | null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[workflowAiService] Gemini request threw: ${message}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const runWorkflowAiJson = async <T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> => {
  const claudeResult = await runClaudeJson<T>(systemPrompt, userPrompt)
  if (claudeResult) {
    return claudeResult
  }

  return await runGeminiJson<T>(systemPrompt, userPrompt)
}

const buildLeadSummary = (
  serviceType: string,
  location: string,
  urgency: string,
  budget: BudgetRange
) => {
  const budgetText = budget.text || 'budget not provided'
  return `Lead needs ${serviceType.replace(/_/g, ' ')} support in ${location} with ${urgency} urgency and ${budgetText}.`
}

const heuristicLeadEnrichment = (payload: {
  message: string
  name: string
}): LeadEnrichment => {
  const serviceType = normalizeServiceType(payload.message)
  const budget = extractBudgetFromText(payload.message)
  const urgency = normalizeUrgency(payload.message)
  const location = extractLocationFromText(payload.message)

  return {
    serviceType,
    budget,
    urgency,
    location,
    summary: buildLeadSummary(serviceType, location, urgency, budget),
  }
}

const heuristicLeadQualification = (payload: {
  name: string
  contact: string
  message: string
  enrichment: LeadEnrichment
}): LeadQualification => {
  const reasons: string[] = []
  let score = 20

  if (payload.name.trim()) {
    score += 10
    reasons.push('Lead provided a name')
  }

  if (payload.contact.trim()) {
    score += 20
    reasons.push('Lead provided contact information')
  }

  if (payload.enrichment.serviceType) {
    score += 15
    reasons.push('Service type identified')
  }

  if (payload.enrichment.location && payload.enrichment.location !== 'Singapore') {
    score += 10
    reasons.push('Location identified')
  }

  if (payload.enrichment.budget.min || payload.enrichment.budget.max) {
    score += 15
    reasons.push('Budget identified')
  }

  if (payload.enrichment.urgency === 'high') {
    score += 15
    reasons.push('Urgent buying signal detected')
  } else if (payload.enrichment.urgency === 'medium') {
    score += 8
    reasons.push('Moderate urgency detected')
  }

  if (payload.message.length > 50) {
    score += 10
    reasons.push('Lead message contains useful context')
  }

  const bounded = Math.max(0, Math.min(100, score))
  const classification = bounded >= 75 ? 'HIGH' : bounded >= 45 ? 'MEDIUM' : 'LOW'

  return {
    score: bounded,
    classification,
    reasons,
  }
}

const heuristicInquiry = (payload: {
  message: string
  name: string
}): InquiryAutomationResult => {
  const text = payload.message.toLowerCase()

  if (/(complaint|refund|angry|issue|problem|bad service|disappointed)/.test(text)) {
    return {
      intent: 'complaint',
      workflow: 'support_escalation',
      reply:
        'We are sorry to hear about the issue. Our support team has logged your complaint and will follow up shortly to resolve it.',
    }
  }

  if (/(hire|hiring|need a maid|need helper|looking for helper|looking for maid)/.test(text)) {
    return {
      intent: 'hiring',
      workflow: 'maid_matching',
      reply:
        'Thanks for your hiring request. We are reviewing your requirements now and will shortlist suitable maid profiles for you shortly.',
    }
  }

  return {
    intent: 'inquiry',
    workflow: 'general_inquiry',
    reply:
      'Thanks for reaching out. We have logged your inquiry and our team will get back to you with the right information shortly.',
  }
}

const heuristicMatchRanking = (
  criteria: MatchCriteria,
  candidates: MatchCandidate[]
) => {
  const sorted = [...candidates].sort((a, b) => b.score - a.score).slice(0, 3)
  return sorted.map((candidate, index) => ({
    ...candidate,
    score: Math.max(candidate.score, 85 - index * 8),
  }))
}

export const enrichLeadWithAi = async (payload: {
  message: string
  name: string
}): Promise<AiResult<LeadEnrichment>> => {
  const fallback = heuristicLeadEnrichment(payload)
  const aiResponse = await runWorkflowAiJson<LeadEnrichment>(
    'Extract lead details as JSON with keys serviceType, budget {min,max,currency,text}, urgency, location, summary.',
    `Lead name: ${payload.name}\nLead message: ${payload.message}`
  )

  if (!aiResponse) {
    return { data: fallback, aiUsed: false }
  }

  return {
    aiUsed: true,
    data: {
      serviceType: normalizeServiceType(String(aiResponse.serviceType ?? fallback.serviceType)),
      budget: normalizeBudget(String(aiResponse.budget?.text ?? fallback.budget.text)),
      urgency: normalizeUrgency(String(aiResponse.urgency ?? fallback.urgency)),
      location: normalizeLocation(String(aiResponse.location ?? fallback.location)),
      summary: normalizeWhitespace(String(aiResponse.summary ?? fallback.summary)),
    },
  }
}

export const qualifyLeadWithAi = async (payload: {
  name: string
  contact: string
  message: string
  enrichment: LeadEnrichment
}): Promise<AiResult<LeadQualification>> => {
  const fallback = heuristicLeadQualification(payload)
  const aiResponse = await runWorkflowAiJson<LeadQualification>(
    'Score the lead from 0 to 100 and classify as HIGH, MEDIUM, or LOW. Return JSON with score, classification, reasons.',
    JSON.stringify(payload)
  )

  if (!aiResponse) {
    return { data: fallback, aiUsed: false }
  }

  const rawScore = Number(aiResponse.score)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : fallback.score
  const classification =
    aiResponse.classification === 'HIGH' ||
    aiResponse.classification === 'MEDIUM' ||
    aiResponse.classification === 'LOW'
      ? aiResponse.classification
      : fallback.classification

  return {
    aiUsed: true,
    data: {
      score,
      classification,
      reasons: Array.isArray(aiResponse.reasons)
        ? aiResponse.reasons.map((reason) => String(reason))
        : fallback.reasons,
    },
  }
}

export const classifyInquiryWithAi = async (payload: {
  message: string
  name: string
}): Promise<AiResult<InquiryAutomationResult>> => {
  const fallback = heuristicInquiry(payload)
  const aiResponse = await runWorkflowAiJson<InquiryAutomationResult>(
    'Classify the inquiry as hiring, inquiry, or complaint. Return JSON with intent, workflow, and reply.',
    JSON.stringify(payload)
  )

  if (!aiResponse) {
    return { data: fallback, aiUsed: false }
  }

  return {
    aiUsed: true,
    data: {
      intent:
        aiResponse.intent === 'hiring' ||
        aiResponse.intent === 'complaint' ||
        aiResponse.intent === 'inquiry'
          ? aiResponse.intent
          : fallback.intent,
      workflow:
        aiResponse.workflow === 'maid_matching' ||
        aiResponse.workflow === 'support_escalation' ||
        aiResponse.workflow === 'general_inquiry' ||
        aiResponse.workflow === 'lead_nurture'
          ? aiResponse.workflow
          : fallback.workflow,
      reply: normalizeWhitespace(String(aiResponse.reply ?? fallback.reply)),
    },
  }
}

export const rankMatchesWithAi = async (
  criteria: MatchCriteria,
  candidates: MatchCandidate[]
): Promise<AiResult<MatchCandidate[]>> => {
  const fallback = heuristicMatchRanking(criteria, candidates)

  if (candidates.length === 0) {
    return { data: [], aiUsed: false }
  }

  const aiResponse = await runWorkflowAiJson<{ matches: MatchCandidate[] }>(
    'Rank the best maid matches. Return JSON with matches array containing maidId, maidReferenceCode, maidName, score, reasons.',
    JSON.stringify({ criteria, candidates })
  )

  if (!aiResponse || !Array.isArray(aiResponse.matches)) {
    return { data: fallback, aiUsed: false }
  }

  const mapped = aiResponse.matches
    .map((match) => {
      const original = candidates.find((candidate) => candidate.maidId === match.maidId)
      if (!original) return null
      return {
        ...original,
        score: Number.isFinite(Number(match.score))
          ? Math.max(0, Math.min(100, Number(match.score)))
          : original.score,
        reasons: Array.isArray(match.reasons)
          ? match.reasons.map((reason) => String(reason))
          : original.reasons,
      }
    })
    .filter((item): item is MatchCandidate => Boolean(item))
    .slice(0, 3)

  return {
    data: mapped.length > 0 ? mapped : fallback,
    aiUsed: mapped.length > 0,
  }
}

export const generateContractDraftWithAi = async (payload: {
  maidId: number
  employerId: number
  serviceType: string
  location: string
  budgetText: string
  scheduleDate: string
}): Promise<AiResult<{ contractText: string; summary: string }>> => {
  const fallbackText = [
    'Employment Service Agreement',
    '',
    `Employer ID: ${payload.employerId}`,
    `Maid ID: ${payload.maidId}`,
    `Service Type: ${payload.serviceType}`,
    `Location: ${payload.location}`,
    `Budget / Salary Terms: ${payload.budgetText || 'To be finalized'}`,
    `Interview / Start Date Reference: ${payload.scheduleDate || 'To be scheduled'}`,
    '',
    'Terms:',
    '1. The agency will coordinate screening, matching, and interview scheduling.',
    '2. The employer will confirm final hiring terms before activation.',
    '3. The maid candidate remains subject to availability and final approval.',
    '4. Any personal data exchanged is used only for hiring workflow administration.',
  ].join('\n')

  const fallbackSummary = `Draft contract prepared for employer ${payload.employerId} and maid ${payload.maidId}.`

  const aiResponse = await runWorkflowAiJson<{ contractText: string; summary: string }>(
    'Draft a concise structured employment service contract. Return JSON with contractText and summary.',
    JSON.stringify(payload)
  )

  if (!aiResponse) {
    return {
      data: { contractText: fallbackText, summary: fallbackSummary },
      aiUsed: false,
    }
  }

  return {
    aiUsed: true,
    data: {
      contractText: String(aiResponse.contractText ?? fallbackText),
      summary: String(aiResponse.summary ?? fallbackSummary),
    },
  }
}
