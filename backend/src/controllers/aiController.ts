import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { processInquiryWithAiOrchestrator } from '../services/aiOrchestratorService'
import {
  optionalString,
  positiveInteger,
  requiredString,
} from '../services/workflowValidationService'
import {
  assertNoLegacyWorkflowResponse,
  normalizeWorkflow,
} from '../services/workflowNameService'
import { buildWorkflowResponse } from '../services/workflowResponseService'
import { getAllMaidsStore, getCompanyBundle, type CompanyProfileRecord, type MaidRecord } from '../store'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant'

const buildWhatsAppLink = (profile: CompanyProfileRecord | null): string => {
  if (!profile) return ''
  const p = profile as unknown as Record<string, unknown>
  const raw = (p.social_whatsapp_number || p.contact_phone || '') as string
  const hasPlus = raw.trimStart().startsWith('+')
  let digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (!hasPlus && digits.length === 9 && digits.startsWith('0')) digits = digits.slice(1)
  if (!hasPlus && digits.length === 8) digits = `65${digits}`
  return `https://wa.me/${digits}`
}

const FAQ_KNOWLEDGE = [
  {
    q: 'How much is the maid levy?',
    a: 'The standard Singapore maid levy is $300 per month, or $9.87 per day. A concessionary levy of $60 per month may apply for eligible households, such as those with a child below 16, an elderly person, or a person with disabilities.',
  },
  {
    q: 'How much are the agency fees?',
    a: 'Exact agency fees depend on the helper profile, hiring type, package, documents, insurance, and current case details. The agency team can confirm the final fee breakdown before you proceed.',
  },
  {
    q: 'What is the average salary of a Filipino maid?',
    a: 'The Philippine Overseas Employment Administration stipulates a minimum salary of $570. New or transfer Filipino maids typically earn $570-$650, while more experienced maids may command $600-$750 or higher.',
  },
  {
    q: 'What is the average salary of a Myanmar maid?',
    a: 'Myanmar maid salary ranges from about $450-$550, depending on skill level. Experienced or transfer Myanmar maids typically earn $500-$650 or more.',
  },
  {
    q: 'What is the average salary of an Indonesian maid?',
    a: 'New Indonesian maids typically earn $550-$570. Experienced Indonesian maids earn $600-$750 or more, depending on skill sets and years of experience.',
  },
  {
    q: 'What is the average salary of a Sri Lankan maid?',
    a: 'New Sri Lankan maids earn about $480-$550. Experienced Sri Lankan maids start from around $650 and above.',
  },
  {
    q: 'What is the average salary of an Indian maid?',
    a: 'Indian maid salaries range from about $400-$600, increasing with experience and specialised skills.',
  },
  {
    q: 'What is the salary of a Bangladeshi maid?',
    a: 'Bangladeshi maid salary is approximately $400-$600. Salary increases with experience.',
  },
  {
    q: 'What is the salary of a Punjabi maid?',
    a: 'Punjabi maid salary starts from approximately $480 and increases with experience and skill level.',
  },
  {
    q: 'What documents are needed for a first-time employer?',
    a: 'Local employers usually need identity cards for the employer and household members, plus proof of income such as Notice of Assessment or CPF contribution statements for the last 3 months. Expatriate employers usually need passport copies, Employment Pass and Dependent Passes, plus proof of income or an employment letter.',
  },
  {
    q: "What are the employer's obligations to the maid?",
    a: 'Employers must pay salary on time, provide adequate food and suitable accommodation, provide medical care including hospitalisation, provide a safe working environment, and treat the maid with respect and dignity.',
  },
  {
    q: 'What is Personal Accident Insurance?',
    a: 'Employers must purchase personal accident insurance for their maid with a minimum insured sum of $10,000.',
  },
]

const COMPANY_KEYWORDS = [
  'company',
  'agency',
  'background',
  'history',
  'story',
  'origin',
  'origins',
  'founded',
  'founding',
  'since',
  'office',
  'address',
  'location',
  'contact',
  'phone',
  'email',
  'website',
  'hour',
  'hours',
  'about',
  'license',
  'licence',
  'details',
  'service',
  'services',
]

const ABOUT_US_PAGE_CONTEXT = [
  // Paragraph 1 — Who we are
  [
    'At The Agency (formerly Rinzin Agency Pte. Ltd.), we have been a trusted name in domestic helper placement since 2005.',
    "We place carefully selected helpers with families in Singapore and internationally, matching each helper to the family's language, dietary, and cultural needs.",
  ].join(' '),

  // Paragraph 2 — Our origin story
  [
    'Our story began in 2005 when, as a Singaporean Chinese with deep ties to India, we became the first agency in Singapore to introduce domestic helpers from Lahaul and Spiti, Himachal Pradesh, and Ladakh.',
    'Since then, we have steadily expanded our network to include a wider range of origins and backgrounds, giving families more choice than ever before.',
  ].join(' '),

  // Paragraph 3 — Our philosophy
  [
    'We believe in dealing with real people from different cultures — and in facing and solving problems swiftly.',
    'Our guiding policy is simple: The right worker, delivered on time.',
  ].join(' '),

  // Paragraph 4 — Our expertise
  [
    'Our core expertise covers North East Indian helpers (including Darjeeling, Sikkim, Manipur, Nepalese Hindu, and Tibetan Buddhist backgrounds), Filipino helpers with video interviews available, and Myanmar helpers.',
    'We also place South Indian, Indonesian, Punjabi, Lahaul and Spiti, Himachal Pradesh, and Ladakh helpers.',
  ].join(' '),

  // Paragraph 5 — What sets us apart
  [
    'Every helper we present is verified, screened, and culturally matched.',
    'We also offer SMS crisis support throughout the placement and, for international clients, we assist with relocating fresh and experienced helpers to reputable employers in Europe and the UK.',
  ].join(' '),
].join('\n\n')

const GENERIC_SEARCH_TERMS = new Set([
  'available',
  'availability',
  'best',
  'find',
  'maid',
  'maids',
  'helper',
  'helpers',
  'fdw',
  'list',
  'match',
  'recommend',
  'show',
  'shortlist',
  'suitable',
  'top',
  'which',
  'who',
  'hire',
  'hired',
  'hiring',
  'range',
  'much',
  'when',
  'what',
  'how',
  'can',
  'does',
  'with',
  'your',
  'the',
  'and',
  'for',
  'need',
  'want',
  'looking',
  'look',
  'care',
])

const FEATURED_MAID_CARD_LIMIT = 10
const GENERIC_MAID_LIST_CARD_LIMIT = 10
const ALL_MAIDS_OVERVIEW_LIMIT = 60

const CARD_REQUEST_PATTERN =
  /\b(show|find|recommend|match|shortlist|available|availability|who|which|suitable|helper|helpers|maid|maids|fdw|filipino|indonesian|myanmar|burmese|indian|sri lankan|bangladeshi|transfer|elderly|childcare|infant|disabled|housework|cooking)\b/i

const CARD_LIST_REQUEST_PATTERN =
  /\b(top|best|show|find|recommend|match|shortlist|list|available|availability|who|which|suitable)\b/i

const MAID_PROFILE_REQUEST_PATTERN =
  /\b(background|profile|bio|biodata|experience|history|introduction|intro|details|tell me about|information|info|who is|who's|about|show me|describe|more about|can you tell)\b/i

const MAID_TOPIC_PATTERN =
  /\b(maid|maids|helper|helpers|fdw|filipino|indonesian|myanmar|burmese|indian|sri lankan|bangladeshi|transfer|elderly|childcare|infant|disabled|housework|cooking|cook)\b/i

const FEE_QUESTION_PATTERN = /\b(fee|fees|cost|costs|price|pricing|salary|salaries|levy|loan|insurance)\b/i

const OFF_TOPIC_PATTERN =
  /\b(weather|sports|football|basketball|movie|movies|song|joke|recipe|coding|programming|homework|math|bitcoin|crypto|stock|stocks|politics|president|news)\b/i

// Pattern to detect work/productivity-related questions that the AI assistant should always help with
const WORK_PRODUCTIVITY_PATTERN =
  /\b(help|assist|how to|how do|what is|explain|summarize|write|draft|create|plan|organize|schedule|remind|suggest|recommend|idea|brainstorm|tips|advice|guide|tutorial|learn|understand|clarify|define|meaning|example|template|format|document|email|letter|report|proposal|presentation|meeting|task|project|deadline|priority|workflow|process|improve|optimize|efficient|productivity|time management|goal|strategy|technique|method|approach|solution|problem|issue|challenge|fix|resolve|troubleshoot|debug|error|mistake|correct|review|feedback|opinion|compare|difference|pros|cons|benefits|drawbacks|best practice|checklist|step|steps|instructions|instructions)\b/i

// Pronoun pattern used to detect follow-up questions that refer back to a
// previously-discussed maid (e.g. "what is the rating of her english?",
// "is he available next month?", "how old is she?")
const PRONOUN_REFERENCE_PATTERN = /\b(her|him|he|she|his|hers|their|they|them|that maid|that helper|this maid|this helper)\b/i

const isDisplayablePublicMaid = (maid: MaidRecord) => {
  const status = String(maid.status ?? '').trim().toLowerCase()
  if (!status) return true
  return !/\b(unavailable|inactive|rejected|blacklist|blacklisted|hidden|archived|deleted)\b/.test(status)
}

const normalizeTerms = (text: string) =>
  text
    .toLowerCase()
    .replace(/\bfilipina\b/g, 'filipino')
    .replace(/\bphilippines?\b/g, 'filipino')
    .replace(/\bburmese\b/g, 'myanmar')
    .replace(/\bchildren\b/g, 'child')
    .replace(/\bbaby\b/g, 'infant')
    .replace(/\bold\s+folk(s)?\b/g, 'elderly')
    .replace(/\bsenior(s)?\b/g, 'elderly')
    .replace(/\baged\b/g, 'elderly')
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !GENERIC_SEARCH_TERMS.has(term))

const maidSearchText = (maid: MaidRecord) =>
  [
    maid.fullName,
    maid.referenceCode,
    maid.nationality,
    maid.type,
    maid.status,
    maid.educationLevel,
    maid.religion,
    maid.maritalStatus,
    JSON.stringify(maid.languageSkills ?? {}),
    JSON.stringify(maid.skillsPreferences ?? {}),
    JSON.stringify(maid.workAreas ?? {}),
    JSON.stringify(maid.employmentHistory ?? []),
    JSON.stringify(maid.introduction ?? {}),
  ]
    .join(' ')
    .toLowerCase()

const isCompanyQuestion = (message: string) => {
  const lower = message.toLowerCase()
  const mentionsMaid = MAID_TOPIC_PATTERN.test(lower)
  const explicitlyCompany =
    /\b(company|agency|office|address|location|contact|phone|email|website|license|licence|service|services|about\s+us|about\s+the\s+agency|about\s+your\s+agency)\b/i.test(
      lower
    )
  if (/\btell\s+me\s+about\b/i.test(lower) && !explicitlyCompany) return false
  if (mentionsMaid && !explicitlyCompany) return false
  return COMPANY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

const isAgencyBackgroundQuestion = (message: string) =>
  /\b(background|history|story|origin|origins|founded|founding|since|about\s+us|about\s+the\s+agency|about\s+your\s+agency)\b/i.test(
    message
  )

const isMaidSearchQuestion = (message: string) => CARD_REQUEST_PATTERN.test(message)

const isMaidCardListQuestion = (message: string) =>
  CARD_LIST_REQUEST_PATTERN.test(message) && MAID_TOPIC_PATTERN.test(message) && !FEE_QUESTION_PATTERN.test(message)

const isMaidProfileQuestion = (message: string) =>
  MAID_TOPIC_PATTERN.test(message) && MAID_PROFILE_REQUEST_PATTERN.test(message) && !FEE_QUESTION_PATTERN.test(message)

const isOffTopicQuestion = (message: string) =>
  OFF_TOPIC_PATTERN.test(message) && !isCompanyQuestion(message) && !isMaidSearchQuestion(message) && !WORK_PRODUCTIVITY_PATTERN.test(message)

const isWorkProductivityQuestion = (message: string) =>
  WORK_PRODUCTIVITY_PATTERN.test(message) && !isCompanyQuestion(message) && !isMaidSearchQuestion(message)

const isFeeOrPricingQuestion = (message: string) => FEE_QUESTION_PATTERN.test(message)

/**
 * Detects "follow-up" questions that use a pronoun ("her", "she", "his",
 * "he", "their") to refer back to a maid discussed earlier in the
 * conversation, without naming the maid or matching any maid-topic keyword.
 * e.g. "what is the rating of her english?"
 */
const isPronounFollowUpQuestion = (message: string) =>
  PRONOUN_REFERENCE_PATTERN.test(message)

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const compactList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(', ')
  }
  return String(value ?? '').trim()
}

const formatMoneyText = (value: string) => value.replace(/\bS\$/g, '$')

/** Strip HTML tags and decode basic entities from rich-text fields */
const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()

const normalizeComparableText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isNewMaid = (maid: MaidRecord) =>
  /\b(new|fresh)\b/i.test(String(maid.type || ''))

const isGenericMaidListRequest = (message: string, terms = normalizeTerms(message)) =>
  terms.length === 0 &&
  /\b(list|show|see|available|availability|recommend|maids|maid|helpers|helper|fdw)\b/i.test(message)

const extractMaidReferenceFromPath = (value: unknown) => {
  const path = String(value ?? '').trim()
  const match = path.match(/\/maids\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1] ?? '').trim() : ''
}

// ---------------------------------------------------------------------------
// Conversation state cache (for pronoun follow-up resolution)
// ---------------------------------------------------------------------------

const CONVERSATION_STATE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const CONVERSATION_STATE_SWEEP_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const CONVERSATION_STATE_MAX_ENTRIES = 5000

type ConversationState = {
  lastMaidReferenceCode: string
  updatedAt: number
}

const conversationStateStore = new Map<string, ConversationState>()

const sweepConversationStateStore = () => {
  const now = Date.now()
  for (const [key, state] of conversationStateStore.entries()) {
    if (now - state.updatedAt > CONVERSATION_STATE_TTL_MS) {
      conversationStateStore.delete(key)
    }
  }
  if (conversationStateStore.size > CONVERSATION_STATE_MAX_ENTRIES) {
    const entries = [...conversationStateStore.entries()].sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt
    )
    const excess = entries.length - CONVERSATION_STATE_MAX_ENTRIES
    for (let i = 0; i < excess; i++) {
      conversationStateStore.delete(entries[i]![0])
    }
  }
}

let conversationStateSweepTimer: NodeJS.Timeout | null = null
const ensureConversationStateSweepScheduled = () => {
  if (conversationStateSweepTimer) return
  conversationStateSweepTimer = setInterval(
    sweepConversationStateStore,
    CONVERSATION_STATE_SWEEP_INTERVAL_MS
  )
  conversationStateSweepTimer.unref?.()
}
ensureConversationStateSweepScheduled()

const getLastDiscussedMaidReference = (conversationId: string): string => {
  const state = conversationStateStore.get(conversationId)
  if (!state) return ''
  if (Date.now() - state.updatedAt > CONVERSATION_STATE_TTL_MS) {
    conversationStateStore.delete(conversationId)
    return ''
  }
  return state.lastMaidReferenceCode
}

const setLastDiscussedMaidReference = (conversationId: string, referenceCode: string) => {
  if (!conversationId || !referenceCode) return
  conversationStateStore.set(conversationId, {
    lastMaidReferenceCode: referenceCode,
    updatedAt: Date.now(),
  })
}

// ---------------------------------------------------------------------------
// Skill / language rating helpers
// ---------------------------------------------------------------------------

const ratingLabel = (raw: unknown): string => {
  const str = String(raw ?? '').trim()
  const numeric = parseFloat(str.replace(/\/.*$/, '').trim())
  if (isNaN(numeric)) return ''
  if (numeric >= 5) return 'excellent'
  if (numeric >= 4) return 'good'
  if (numeric >= 3) return 'adequate'
  if (numeric >= 2) return 'basic'
  return 'limited'
}

const languageLevelLabel = (raw: unknown): string => {
  const level = String(raw ?? '').trim().toLowerCase()
  if (!level) return ''
  if (/\b(excellent|fluent|native|very\s*good)\b/.test(level)) return 'fluently'
  if (/\bgood\b/.test(level)) return 'well'
  if (/\bconversational\b/.test(level)) return 'conversationally'
  if (/\b(little|basic|poor|fair|limited|some)\b/.test(level)) return 'a little'
  return level
}

// ---------------------------------------------------------------------------
// Work area / skill descriptions
// ---------------------------------------------------------------------------

const describeWorkAreas = (maid: MaidRecord) =>
  Object.entries(asRecord(maid.workAreas))
    .map(([area, raw]) => {
      const config = asRecord(raw)
      const willing = config.willing ? 'willing' : ''
      const experience = config.experience ? 'has experience' : ''
      const years = compactList(config.yearsOfExperience)
      const evaluation = compactList(config.evaluation)
      const details = [willing, experience, years ? `${years} experience` : '', evaluation]
        .filter(Boolean)
        .join(', ')
      return details ? `${area}: ${details}` : ''
    })
    .filter(Boolean)
    .slice(0, 8)
    .join('; ')

/**
 * Returns a natural-language sentence describing language ability,
 * e.g. "She speaks English well and understands a little Mandarin."
 */
const describeLanguagesSentence = (maid: MaidRecord): string => {
  const entries = Object.entries(maid.languageSkills ?? {})
    .filter(([, level]) => String(level ?? '').trim())
    .slice(0, 5)

  if (entries.length === 0) return ''

  const fluent: string[] = []
  const basic: string[] = []

  for (const [lang, level] of entries) {
    const label = languageLevelLabel(level)
    const cleanLang = lang.replace(/\s*\/\s*/g, '/')
    if (/fluently|well|conversationally/.test(label)) {
      fluent.push(cleanLang)
    } else {
      basic.push(cleanLang)
    }
  }

  const joinList = (items: string[]): string => {
    if (items.length === 1) return items[0]!
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
  }

  const parts: string[] = []
  if (fluent.length > 0) parts.push(`communicates well in ${joinList(fluent)}`)
  if (basic.length > 0) parts.push(`has a working knowledge of ${joinList(basic)}`)

  if (parts.length === 0) return ''
  const sentence = parts.join(', and ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

/**
 * Returns a natural-language sentence for the top 3 skills,
 * e.g. "She is particularly good at cooking and has experience with elderly care."
 */
const describeTopSkillsSentence = (maid: MaidRecord): string => {
  const scored = Object.entries(asRecord(maid.workAreas))
    .map(([area, raw]) => {
      const config = asRecord(raw)
      const evaluation = compactList(config.evaluation)
      const experience = Boolean(config.experience)
      const willing = Boolean(config.willing)
      const years = compactList(config.yearsOfExperience)

      const ratingMatch = evaluation.match(/^(\d(?:\.\d)?)\s*\/\s*5/)
      const numericRating = ratingMatch ? parseFloat(ratingMatch[1] ?? '0') : 0
      const label = numericRating ? ratingLabel(numericRating) : ''

      const score =
        numericRating >= 4 ? 4 :
        experience ? 3 :
        willing ? 2 :
        numericRating >= 3 ? 1 :
        0

      return { area, score, label, years, experience }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (scored.length === 0) return ''

  const verbPhrase = (score: number): string => {
    if (score >= 4) return 'excels at'
    if (score === 3) return 'is capable in'
    return 'is willing to assist with'
  }

  const byVerb: Record<string, string[]> = {}
  for (const item of scored) {
    const verb = verbPhrase(item.score)
    if (!byVerb[verb]) byVerb[verb] = []
    byVerb[verb]!.push(item.area.toLowerCase())
  }

  const clauses = Object.entries(byVerb).map(([verb, areas]) => {
    const list = areas.length === 1
      ? areas[0]!
      : `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`
    return `${verb} ${list}`
  })

  if (clauses.length === 1) return `She ${clauses[0]}.`
  const last = clauses.pop()
  return `She ${clauses.join(', ')}, and ${last}.`
}

// Legacy helpers kept for the Groq prompt context
const describeLanguages = (maid: MaidRecord) =>
  Object.entries(maid.languageSkills ?? {})
    .filter(([, level]) => String(level ?? '').trim())
    .map(([language, level]) => {
      const cleanLanguage = language.replace(/\s*\/\s*/g, '/')
      const cleanLevel = String(level).trim()
      return cleanLevel ? `${cleanLanguage} (${cleanLevel})` : cleanLanguage
    })
    .slice(0, 4)
    .join(', ')

const describeMaidForPrompt = (maid: MaidRecord) => {
  const intro = asRecord(maid.introduction)
  const skills = asRecord(maid.skillsPreferences)
  const languageSkills = describeLanguages(maid)
  const employment = Array.isArray(maid.employmentHistory)
    ? maid.employmentHistory.slice(0, 3).map((item) => asRecord(item))
    : []
  const employmentSummary = employment
    .map((item) =>
      Object.entries(item)
        .filter(([, value]) => String(value ?? '').trim())
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ')
    )
    .filter(Boolean)
    .join(' | ')

  return [
    `Name: ${maid.fullName}`,
    `Reference: ${maid.referenceCode}`,
    `Nationality/type/status: ${maid.nationality || 'N/A'} / ${maid.type || 'N/A'} / ${
      maid.status || 'available'
    }`,
    `Expected salary: ${compactList(intro.expectedSalary) || 'N/A'}`,
    `Present salary: ${compactList(intro.presentSalary) || 'N/A'}`,
    `Availability: ${compactList(intro.availability) || compactList(skills.availabilityRemark) || 'N/A'}`,
    `Public intro: ${stripHtml(compactList(intro.publicIntro)) || 'N/A'}`,
    `Languages: ${languageSkills || 'N/A'}`,
    `Work skills: ${describeWorkAreas(maid) || 'N/A'}`,
    `Employment: ${employmentSummary || 'N/A'}`,
  ].join('\n')
}

const findRelevantFaqs = (message: string) => {
  const terms = normalizeTerms(message)
  return FAQ_KNOWLEDGE.map((faq) => {
    const haystack = `${faq.q} ${faq.a}`.toLowerCase()
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
    return { faq, score }
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ faq }) => faq)
}

const scoreMaid = (maid: MaidRecord, terms: string[]) => {
  const haystack = maidSearchText(maid)
  const nationality = String(maid.nationality || '').toLowerCase()
  const workAreas = JSON.stringify(maid.workAreas ?? {}).toLowerCase()
  const intro = JSON.stringify(maid.introduction ?? {}).toLowerCase()
  const skills = JSON.stringify(maid.skillsPreferences ?? {}).toLowerCase()
  const employment = JSON.stringify(maid.employmentHistory ?? []).toLowerCase()

  return terms.reduce((sum, term) => {
    if (!haystack.includes(term)) return sum
    const exactNationality = nationality.includes(term) ? 8 : 0
    const workMatch = workAreas.includes(term) ? 5 : 0
    const profileMatch = intro.includes(term) || skills.includes(term) || employment.includes(term) ? 3 : 0
    return sum + 1 + exactNationality + workMatch + profileMatch
  }, 0)
}

const toFeaturedMaid = (maid: MaidRecord) => ({
  id: maid.id,
  referenceCode: maid.referenceCode,
  fullName: maid.fullName,
  nationality: maid.nationality,
  type: maid.type,
  status: maid.status ?? 'available',
  hasPhoto: maid.hasPhoto,
  photoUrl:
    (Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls[0] : null) ||
    maid.photoDataUrl ||
    null,
})

const NUMBER_WORD_VALUES: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
}

const extractRequestedCount = (message: string): number | null => {
  const match = message.match(
    /\b(?:list|show|top|give\s+me|find|recommend|shortlist)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?:maid|helper|fdw|filipino|filipina|myanmar|burmese|indonesian|indian|profile)?s?\b/i
  )
  if (!match) return null
  const countText = (match[1] ?? '').toLowerCase()
  const n = /^\d+$/.test(countText) ? parseInt(countText, 10) : NUMBER_WORD_VALUES[countText] ?? 0
  return n >= 1 && n <= 20 ? n : null
}

const describeRequestedMaidGroup = (message: string): string => {
  if (/\b(filipino|filipina|philippines?)s?\b/i.test(message)) return 'Filipino helper'
  if (/\b(indonesian)s?\b/i.test(message)) return 'Indonesian helper'
  if (/\b(myanmar|burmese)\b/i.test(message)) return 'Myanmar helper'
  if (/\b(indian)s?\b/i.test(message)) return 'Indian helper'
  if (/\bsri\s+lankan?s?\b/i.test(message)) return 'Sri Lankan helper'
  if (/\bbangladeshi?s?\b/i.test(message)) return 'Bangladeshi helper'
  return 'matching helper'
}

const pickFeaturedMaidRecords = (message: string, maids: MaidRecord[]) => {
  const terms = normalizeTerms(message)
  const genericListRequest = isGenericMaidListRequest(message, terms)
  const requestedCount = extractRequestedCount(message)
  const limit = requestedCount ?? (genericListRequest ? GENERIC_MAID_LIST_CARD_LIMIT : FEATURED_MAID_CARD_LIMIT)

  const publicMaids = maids.filter((maid) => maid.isPublic && isDisplayablePublicMaid(maid))
  const scored = publicMaids.map((maid) => {
    const score = scoreMaid(maid, terms)
    return { maid, score }
  })

  const candidates = scored
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((left, right) => right.score - left.score || right.maid.id - left.maid.id)

  // A generic "list maids" request means recently added records, not maids
  // whose employment type happens to be "New". The id tie-breaker above
  // orders these newest-first. Filtered searches retain relevance ordering.
  const ordered = candidates

  return ordered.slice(0, limit).map(({ maid }) => maid)
}

const pickFeaturedMaids = (message: string, maids: MaidRecord[]) =>
  pickFeaturedMaidRecords(message, maids).map(toFeaturedMaid)

/**
 * Builds a compact, full-database overview of every public, displayable maid
 * so the AI is aware of the entire available pool.
 */
const buildAllMaidsOverview = (maids: MaidRecord[]) => {
  const publicMaids = maids.filter((maid) => maid.isPublic && isDisplayablePublicMaid(maid))

  if (publicMaids.length === 0) {
    return 'No public helper profiles are currently available in the database.'
  }

  const lines = publicMaids.slice(0, ALL_MAIDS_OVERVIEW_LIMIT).map((maid) => {
    const category = [maid.nationality, maid.type].filter(Boolean).join(', ')
    const status = maid.status ? `, status: ${maid.status}` : ''
    return `- ${maid.fullName} (${maid.referenceCode})${category ? ` - ${category}` : ''}${status}`
  })

  const remaining = publicMaids.length - lines.length
  if (remaining > 0) {
    lines.push(`...and ${remaining} more public helper profile(s) in the database.`)
  }

  return [`Total public helper profiles available: ${publicMaids.length}`, ...lines].join('\n')
}

// ---------------------------------------------------------------------------
// buildMaidCardIntro — plain-text, no markdown syntax
// ---------------------------------------------------------------------------

/**
 * Builds a polished, readable introduction for a single maid.
 * Output is plain text — no markdown bold, italic, or underscore syntax.
 */
const buildSingleMaidIntro = (maid: MaidRecord): string => {
  const intro = asRecord(maid.introduction)
  const skills = asRecord(maid.skillsPreferences)
  const expectedSalary = compactList(intro.expectedSalary)
  const availability = compactList(intro.availability) || compactList(skills.availabilityRemark)
  const publicIntro = stripHtml(compactList(intro.publicIntro))
  const nationality = maid.nationality || ''
  const type = maid.type || ''
  const firstName = maid.fullName.split(' ')[0] ?? maid.fullName

  // Paragraph 1 — Opening
  const typeLabel = type ? type.replace(/maid/i, '').trim() : ''
  const categoryPhrase = [typeLabel, nationality, 'domestic helper'].filter(Boolean).join(' ')
  const firstSentenceOfIntro = publicIntro ? publicIntro.split('.')[0]?.trim() : ''
  const backgroundHint = firstSentenceOfIntro ? ` — ${firstSentenceOfIntro.charAt(0).toLowerCase()}${firstSentenceOfIntro.slice(1)}` : ''
  const opening = `Meet ${maid.fullName} (${maid.referenceCode}), a ${categoryPhrase}${backgroundHint}.`

  // Paragraph 2 — Skills & duties
  const skillsSentence = describeTopSkillsSentence(maid)
  const duties = Object.entries(asRecord(maid.workAreas))
    .filter(([, raw]) => {
      const c = asRecord(raw)
      return c.willing || c.experience
    })
    .map(([area]) => area.toLowerCase())
    .slice(0, 6)
  const dutiesLine = duties.length > 0
    ? `She is confident handling ${duties.slice(0, -1).join(', ')}${duties.length > 1 ? ', and ' : ''}${duties[duties.length - 1]}.`
    : ''
  const skillsPara = [skillsSentence, dutiesLine].filter(Boolean).join(' ')

  // Paragraph 3 — Languages & dietary
  const languageSentence = describeLanguagesSentence(maid)
  const dietary = compactList((asRecord(maid.skillsPreferences)).dietaryHandling)
  const dietaryLine = dietary ? `She is also comfortable ${dietary.toLowerCase()}.` : ''
  const langPara = [languageSentence, dietaryLine].filter(Boolean).join(' ')

  // Paragraph 4 — Availability & salary (plain-text labels, no markdown)
  const availSalaryLines = [
    availability ? `Availability: ${availability}` : '',
    expectedSalary ? `Expected Salary: ${expectedSalary}` : '',
  ].filter(Boolean).join('\n')

  // Paragraph 5 — Closing
  const closing = `With her dedication and professional attitude, ${firstName} is ready to support your household with genuine care and commitment.`

  return formatMoneyText(
    [opening, skillsPara, langPara, availSalaryLines, closing]
      .filter(Boolean)
      .join('\n\n')
  )
}

/**
 * Helper type label for multi-maid cards.
 */
const getMaidTypeLabel = (maid: MaidRecord): string => {
  const type = (maid.type || '').toLowerCase()
  if (/new|fresh/.test(type)) return 'New to Singapore'
  if (/transfer/.test(type)) return 'Transfer'
  if (/ex-sing|ex sing/.test(type)) return 'Ex-Singapore'
  if (/ex-mw|myanmar/.test(type)) return 'Ex-Overseas'
  return maid.type || ''
}

/**
 * Builds a numbered recommendation list with a warm, plain-text intro per maid.
 * No markdown underscores, asterisks, or raw syntax — just clean readable text.
 */
const buildMultiMaidIntro = (maids: MaidRecord[]): string => {
  const allNew = maids.every(isNewMaid)
  const heading = allNew
    ? `We are pleased to present ${maids.length} new helper profile${maids.length > 1 ? 's' : ''} for your consideration:`
    : `Here are our top ${maids.length} recommended helper${maids.length > 1 ? 's' : ''} based on your request:`

  const entries = maids.map((maid, index) => {
    const intro = asRecord(maid.introduction)
    const typeLabel = getMaidTypeLabel(maid)
    const category = [typeLabel, maid.nationality, 'helper'].filter(Boolean).join(' ')

    // Hook from public intro — first sentence only, stripped of HTML
    const rawIntro = stripHtml(compactList(intro.publicIntro))
    const hook = rawIntro
      ? rawIntro.split('.')[0]?.trim() + '.'
      : ''

    // Skills in plain natural English — no raw ratings
    const skillsSentence = describeTopSkillsSentence(maid)

    // Language in plain, grouped English
    const languageSentence = describeLanguagesSentence(maid)

    const availability = compactList(intro.availability)
    const expectedSalary = compactList(intro.expectedSalary)

    // Availability & salary — plain-text labels, no markdown pipes
    const availLine = availability ? `Availability: ${availability}` : ''
    const salaryLine = expectedSalary ? `Expected Salary: ${expectedSalary}` : ''

    // Entry header — name and reference as plain text (no bold markdown sent to raw chat)
    const header = `${index + 1}. ${maid.fullName} (${maid.referenceCode})`
    const subHeader = category

    // Body: hook, then skills, then languages, then availability/salary
    const bodyLines = [
      hook,
      skillsSentence,
      languageSentence,
      availLine,
      salaryLine,
    ].filter(Boolean)

    return [header, subHeader, ...bodyLines].join('\n')
  })

  const closing = 'Tap any profile card below for full details, or ask me about a specific helper by name.'

  return formatMoneyText([heading, ...entries, closing].join('\n\n'))
}

const buildMaidCardIntro = (maids: MaidRecord[]): string => {
  if (!Array.isArray(maids) || maids.length === 0) return ''
  const first = maids[0]
  if (maids.length === 1 && first) return buildSingleMaidIntro(first)
  return buildMultiMaidIntro(maids)
}

// ---------------------------------------------------------------------------

/**
 * Calls Groq with a general AI assistant prompt for off-topic or work/productivity questions.
 * This allows the AI to help users with any question while still maintaining
 * the maid agency context when relevant.
 */
const callGroqGeneralAssistant = async (params: {
  message: string
  companyProfile: CompanyProfileRecord | null
  conversationHistory?: Array<{ role: string; content: string }>
}) => {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.AI_RECEPTIONIST_API_KEY?.trim()
  if (!apiKey) return null

  const companyContext = params.companyProfile
    ? `You are currently assisting users on the website of ${params.companyProfile.company_name || params.companyProfile.short_name || 'a maid agency'}, a Singapore-based domestic helper agency.`
    : 'You are currently assisting users on a maid agency website.'

  const messages = [
    {
      role: 'system',
      content: [
        'You are a helpful, warm, and professional AI assistant. You help users with any question they have, whether related to the maid agency or not.',
        '',
        'CRITICAL — PLAIN TEXT ONLY: This is a chat widget. Do NOT use any markdown syntax in your replies. That means no asterisks (**bold**), no underscores (_italic_), no backticks, no hash headers. Write only plain conversational text. Use line breaks between paragraphs to aid readability.',
        '',
        'FORMATTING & SPACING: Write in short, well-spaced paragraphs. Separate distinct points with a blank line so the message is easy to read. Avoid long unbroken walls of text. Keep sentences clear and concise.',
        '',
        'TONE: Be friendly, approachable, and professional. Use a conversational tone like a helpful colleague. You can use occasional emojis sparingly to add warmth (1-2 per message max).',
        '',
        'CONTEXT:',
        companyContext,
        '',
        'GUIDELINES:',
        '1. Always be helpful and provide useful, accurate information.',
        '2. If the question is about work, productivity, or general topics, provide helpful advice and guidance.',
        '3. If the question could relate to the maid agency context (hiring, household management, etc.), feel free to connect your answer to how the agency can help.',
        '4. For completely unrelated topics (weather, sports, jokes, etc.), still provide a helpful response but keep it brief.',
        '5. If you don\'t know something, be honest about it and suggest where they might find the information.',
        '6. Always maintain a professional and supportive tone.',
        '7. Keep responses concise - aim for 2-4 paragraphs maximum unless the question requires more detail.',
        '8. If the user seems to be testing you or asking random questions, respond warmly and show you\'re here to help.',
        '',
        'Remember: You are representing a professional maid agency. Your responses should reflect the agency\'s commitment to excellent service and customer care.',
      ].join('\n'),
    },
    ...(params.conversationHistory || []).slice(-6).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: params.message,
    },
  ]

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 800,
      messages,
    }),
  })

  if (!response.ok) {
    console.error(`[callGroqGeneralAssistant] Groq API error: ${response.status} ${response.statusText}`)
    return null
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const raw = data.choices?.[0]?.message?.content?.trim() || null
  return raw ? stripMarkdownSyntax(raw) : null
}

const shouldShowMaidCards = (message: string) => {
  return isMaidCardListQuestion(message) && !isCompanyQuestion(message)
}

const fallbackReceptionistResponse = async (
  message: string,
  relevantFaqs: Array<{ q: string; a: string }>,
  featuredMaids: ReturnType<typeof pickFeaturedMaids>,
  relevantMaids: MaidRecord[],
  companyProfile: CompanyProfileRecord | null,
  conversationHistory?: Array<{ role: string; content: string }>
) => {
  // For off-topic or work/productivity questions, use the general AI assistant
  if (isOffTopicQuestion(message) || isWorkProductivityQuestion(message)) {
    const generalResponse = await callGroqGeneralAssistant({
      message,
      companyProfile,
      conversationHistory,
    }).catch(() => null)
    
    if (generalResponse) {
      return generalResponse
    }
    
    // Fallback if Groq is unavailable
    if (isWorkProductivityQuestion(message)) {
      return "I'd be happy to help with that! While I specialize in maid agency services, I can assist with general work and productivity questions too. Could you provide more details about what you need help with?"
    }
    
    return "That's an interesting question! While I'm primarily here to help with maid agency services, I'm happy to assist with other topics too. Feel free to ask me anything, and I'll do my best to help."
  }

  if (isCompanyQuestion(message) && companyProfile) {
    if (isAgencyBackgroundQuestion(message)) {
      const sections = [
        companyProfile.company_name || companyProfile.short_name,
        ABOUT_US_PAGE_CONTEXT,
        companyProfile.about_us ? `Additional company note: ${companyProfile.about_us}` : '',
      ].filter(Boolean)

      return formatMoneyText(sections.join('\n\n'))
    }

    const sections = [
      companyProfile.company_name || companyProfile.short_name,
      companyProfile.license_no ? `License: ${companyProfile.license_no}` : '',
      [companyProfile.address_line1, companyProfile.address_line2, companyProfile.postal_code, companyProfile.country]
        .filter(Boolean)
        .join(', '),
      [
        companyProfile.contact_phone ? `Phone: ${companyProfile.contact_phone}` : '',
        companyProfile.contact_email ? `Email: ${companyProfile.contact_email}` : '',
        companyProfile.contact_website ? `Website: ${companyProfile.contact_website}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      companyProfile.office_hours_regular ? `Office hours: ${companyProfile.office_hours_regular}` : '',
      companyProfile.about_us ? companyProfile.about_us : '',
    ].filter(Boolean)

    return formatMoneyText(sections.join('\n\n'))
  }

  if (isFeeOrPricingQuestion(message) && relevantFaqs.length > 0) {
    return formatMoneyText(
      relevantFaqs
        .map((faq) => faq.a)
        .join('\n\n')
        .slice(0, 900)
    )
  }

  if (relevantMaids.length > 0) {
    return buildMaidCardIntro(relevantMaids).slice(0, 1400)
  }

  if (relevantFaqs.length > 0) {
    return formatMoneyText(
      relevantFaqs
        .map((faq) => faq.a)
        .join('\n\n')
        .slice(0, 900)
    )
  }

  if (isMaidProfileQuestion(message)) {
    return 'Sure, I can help with a helper profile background.\n\nPlease share the helper name or reference code, or open the profile page and ask me again from there.'
  }

  if (featuredMaids.length > 0) {
    const names = featuredMaids.map((maid) => `${maid.fullName} (${maid.referenceCode})`).join(', ')
    return `I found the top ${featuredMaids.length} available helpers that may be a great fit:\n\n${names}\n\nYou can review their profile cards below.`
  }

  // For any other question, try the general AI assistant
  const generalResponse = await callGroqGeneralAssistant({
    message,
    companyProfile,
    conversationHistory,
  }).catch(() => null)
  
  if (generalResponse) {
    return generalResponse
  }

  return "I can help with helper recommendations, skills, company details, salary ranges, levy, fees, documents, insurance, and hiring questions.\n\nI can also assist with general work and productivity questions. Let me know what you need and I'll be happy to help!"
}

const callGroqReceptionist = async (params: {
  message: string
  relevantFaqs: Array<{ q: string; a: string }>
  relevantMaids: MaidRecord[]
  featuredMaids: ReturnType<typeof pickFeaturedMaids>
  companyProfile: CompanyProfileRecord | null
  allMaids: MaidRecord[]
  isPronounFollowUp: boolean
}) => {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.AI_RECEPTIONIST_API_KEY?.trim()
  if (!apiKey) return null

  const faqContext =
    params.relevantFaqs.length > 0
      ? params.relevantFaqs.map((faq) => `Q: ${faq.q}\nA: ${faq.a}`).join('\n\n')
      : 'No matching FAQ snippets.'
  const maidContext =
    params.relevantMaids.length > 0
      ? params.relevantMaids.map(describeMaidForPrompt).join('\n\n---\n\n')
      : 'No matching public maid profiles.'
  const allMaidsOverview = buildAllMaidsOverview(params.allMaids)
  const whatsappLink = buildWhatsAppLink(params.companyProfile)
  const companyContext = params.companyProfile
    ? [
        `Company: ${params.companyProfile.company_name || params.companyProfile.short_name || 'N/A'}`,
        `License: ${params.companyProfile.license_no || 'N/A'}`,
        `Address: ${[
          params.companyProfile.address_line1,
          params.companyProfile.address_line2,
          params.companyProfile.postal_code,
          params.companyProfile.country,
        ]
          .filter(Boolean)
          .join(', ') || 'N/A'}`,
        `Phone: ${params.companyProfile.contact_phone || 'N/A'}`,
        `WhatsApp number: ${(params.companyProfile.social_whatsapp_number || params.companyProfile.contact_phone) || 'N/A'}`,
        `WhatsApp link (use this full URL in replies): ${whatsappLink || 'N/A'}`,
        `Email: ${params.companyProfile.contact_email || 'N/A'}`,
        `Website: ${params.companyProfile.contact_website || 'N/A'}`,
        `Office hours: ${params.companyProfile.office_hours_regular || 'N/A'}`,
        `About: ${params.companyProfile.about_us || 'N/A'}`,
        `About Us page background:\n${ABOUT_US_PAGE_CONTEXT}`,
      ].join('\n')
    : 'No company profile context.'

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: [
            'You are the AI Receptionist for a Singapore maid agency. Always be warm, polite, professional, and helpful. Answer naturally using only the supplied FAQ, company, and maid profile context.',

            'CRITICAL — PLAIN TEXT ONLY: This is a chat widget. Do NOT use any markdown syntax in your replies. That means no asterisks (**bold**), no underscores (_italic_), no backticks, no hash headers. Write only plain conversational text. Use line breaks between paragraphs to aid readability.',

            'FORMATTING & SPACING: Write in short, well-spaced paragraphs. Separate distinct points with a blank line so the message is easy to read. Avoid long unbroken walls of text. Keep sentences clear and concise.',

            'MAID INTRODUCTIONS: When introducing maid profiles, always write in warm, natural sentences. Do not dump raw data. Instead:\n- Describe their key strengths in plain English (e.g. "She is particularly good at cooking and elderly care").\n- Mention languages they speak naturally (e.g. "She communicates well in English and understands a little Mandarin").\n- Keep each profile introduction to 2-3 sentences.\n- Use their name and reference code as a plain-text header like: "1. Jane Doe (REF-001)".\n- Skill ratings (1-5 scale): 5 = excellent, 4 = good, 3 = adequate, 2 = basic, 1 = limited. Translate these into natural phrases — do NOT print the numbers.',

            'HIRING INTENT: Treat ANY of these as hiring intent and respond by showcasing available maids: "looking for a maid", "need help at home", "help around the house", "need a helper", "domestic helper", "someone to cook/clean", "need childcare help", "someone for elderly care", "what maids do you have", "show me available helpers". Never refuse these as off-topic.',

            `MAID RECOMMENDATION LIST: When listing multiple helpers, write a clean plain-text card for EACH maid in the "Profile cards available" list — never skip any. Use this EXACT plain-text format (no markdown symbols):

[Number]. [Full Name] ([Reference Code])
[Type and nationality, e.g. "New to Singapore Filipino helper"]
[OPTIONAL: One short hook sentence from their background — only if publicIntro is available. Strip any HTML. First sentence only.]
[Skills in plain natural English — e.g. "She excels at cooking and elderly care." NO numbers, NO rating labels like "(good)" or "(adequate)".]
[Language sentence — e.g. "She communicates well in English and Tagalog, and has a working knowledge of Mandarin."]
Availability: [value]
Expected Salary: [value]

After ALL profiles, close with this plain line: "Tap any profile card below for full details, or ask me about a specific helper by name."`,

            'FEES & PRICING QUESTIONS: If the customer is asking about fees, costs, pricing, salary ranges, the maid levy, loans, or insurance, answer ONLY in clear, polite text using the FAQ context. Do NOT suggest, list, mention, or showcase any specific maid profiles in your reply for these questions.',

            'FEES (amounts): Never state any specific dollar amount, MOM levy figure, insurance cost, or placement fee. Always say "Contact us for an accurate fee breakdown."',

            'FULL DATABASE AWARENESS: The "All available helper profiles" section lists every public helper currently in the database. Use this to answer general questions accurately. Do not dump this entire list to the customer unless they explicitly ask.',

            'WHATSAPP: When asked for WhatsApp, output the full WhatsApp link URL from the company context AND the human-readable number.',

            'URGENT: For anything described as urgent, give the phone number and WhatsApp link URL in your FIRST sentence.',

            'PROFILE CARDS: Mention profile cards only when the profile cards section lists specific maids AND the question is a hiring/availability question. Introduce every listed maid by name and reference code.',

            `MAID BACKGROUND (single profile): When the user asks about a specific maid by name or reference code, write a warm, professional introduction in this EXACT plain-text structure — each section as its own paragraph:

PARAGRAPH 1 — Opening: "Meet [Full Name] ([Reference Code]), a/an [type] [nationality] domestic helper[, add one compelling detail from their background if available]."

PARAGRAPH 2 — Skills and duties: Describe their top 2-3 work skills in plain, confident English. Then list the specific household tasks they can handle in flowing sentences. Use skill ratings as a guide (4-5 = skilled/experienced, 3 = capable) but DO NOT write ratings or numbers — translate them into natural phrases like "skilled in", "experienced with", "capable of", "provides attentive care for".

PARAGRAPH 3 — Languages and dietary: State how they communicate (e.g. "She communicates well in English and Tagalog"). If dietary or religious preferences are known, mention them here.

PARAGRAPH 4 — Availability and salary: State availability and expected salary clearly as plain lines. If multiple salary options exist, list each on its own line with a dash prefix.

PARAGRAPH 5 — Closing: End with one warm sentence about their attitude and readiness to support a household. Do NOT invent details not present in the profile context.`,

            'FOLLOW-UP QUESTIONS ABOUT A SPECIFIC HELPER: The "Currently discussed helper" context below identifies the helper the customer is asking about. When the customer asks a short follow-up question — e.g. "what is her English like?", "is she available next month?", "what is her expected salary?" — answer ONLY that specific question about THAT helper. Translate raw ratings/levels into plain English (e.g. a language level of "Good" means "Her English is good — she communicates well."). Keep the answer brief — 1 to 3 sentences.',

            'OFF-TOPIC QUESTIONS: If the question is not about maids, hiring, or the agency, still provide a helpful and friendly response. You are a helpful AI assistant that can answer general questions too. Keep off-topic responses brief (1-2 paragraphs) and professional. If appropriate, you can gently mention that you specialize in maid agency services but are happy to help with other topics.',
          ].join('\n\n'),
        },
        {
          role: 'user',
          content: [
            `Customer question: ${params.message}`,
            params.isPronounFollowUp
              ? 'NOTE: This is a pronoun follow-up question about the "Currently discussed helper" below. Answer only the specific question asked about that helper, using their profile data. Do not use the FAQ context for this reply.'
              : '',
            `FAQ context:\n${faqContext}`,
            `Company context:\n${companyContext}`,
            `All available helper profiles (full database overview):\n${allMaidsOverview}`,
            `Currently discussed helper / matched profile context:\n${maidContext}`,
            `Profile cards available: ${
              params.featuredMaids.length > 0
                ? params.featuredMaids
                    .map((maid) => `${maid.fullName} (${maid.referenceCode})`)
                    .join(', ')
                : 'none'
            }`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    console.error(`[callGroqReceptionist] Groq API error: ${response.status} ${response.statusText}`)
    try {
      const errBody = await response.text()
      console.error('[callGroqReceptionist] Groq error body:', errBody)
    } catch (_) { /* ignore */ }
    return null
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  // Strip any residual markdown syntax the model may have produced despite instructions
  const raw = data.choices?.[0]?.message?.content?.trim() || null
  return raw ? stripMarkdownSyntax(raw) : null
}

/**
 * Strips common markdown formatting characters from AI-generated text so the
 * output renders cleanly in a plain-text chat widget.
 *
 * Rules applied (in order):
 *   1. **bold** / __bold__  → bold (content preserved, symbols removed)
 *   2. *italic* / _italic_  → italic (content preserved, symbols removed)
 *   3. `code`               → code (backticks removed)
 *   4. Leading # headers    → plain line (# symbols and trailing space removed)
 *   5. Markdown table pipes → replaced with spaces / dashes for readability
 *   6. Trailing whitespace per line cleaned up
 */
const stripMarkdownSyntax = (text: string): string =>
  text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Italic: *text* or _text_ — use word-boundary approach to avoid mangling normal underscores in codes like REF_001
    .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1')
    // Inline code
    .replace(/`([^`]+)`/g, '$1')
    // ATX headers (# Heading)
    .replace(/^#{1,6}\s+/gm, '')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Clean up any leftover leading/trailing spaces per line
    .replace(/[ \t]+$/gm, '')
    .trim()

const pickRelevantMaidRecords = (message: string, maids: MaidRecord[], limit = 8) => {
  const terms = normalizeTerms(message)
  return maids
    .filter((maid) => maid.isPublic && isDisplayablePublicMaid(maid))
    .map((maid) => {
      const score = scoreMaid(maid, terms)
      return { maid, score }
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((left, right) => right.score - left.score || right.maid.id - left.maid.id)
    .slice(0, limit)
    .map(({ maid }) => maid)
}

const findMaidMentionedInMessage = (message: string, maids: MaidRecord[]) => {
  const normalizedMessage = normalizeComparableText(message)
  if (!normalizedMessage) return null

  const publicMaids = maids.filter((maid) => maid.isPublic && isDisplayablePublicMaid(maid))
  const referenceMatch = publicMaids.find((maid) => {
    const reference = normalizeComparableText(maid.referenceCode)
    return reference && normalizedMessage.includes(reference)
  })
  if (referenceMatch) return referenceMatch

  return (
    publicMaids.find((maid) => {
      const name = normalizeComparableText(maid.fullName)
      if (!name || name.length < 3) return false
      if (normalizedMessage.includes(name)) return true
      const nameParts = name.split(' ').filter((part) => part.length >= 3)
      return nameParts.length > 0 && nameParts.every((part) => normalizedMessage.includes(part))
    }) ?? null
  )
}

const findMaidFromReference = (referenceCode: string, maids: MaidRecord[]) => {
  const normalized = referenceCode.trim().toLowerCase()
  if (!normalized) return null
  return (
    maids.find((maid) => maid.isPublic && maid.referenceCode.toLowerCase() === normalized) ??
    maids.find((maid) => maid.isPublic && maid.referenceCode.toLowerCase().includes(normalized)) ??
    null
  )
}

type RelevantMaidResolution = {
  maids: MaidRecord[]
  isPronounFollowUp: boolean
}

const pickRelevantMaidRecordsForMessage = (
  message: string,
  maids: MaidRecord[],
  currentMaidReference: string,
  conversationId: string
): RelevantMaidResolution => {
  if (FEE_QUESTION_PATTERN.test(message)) return { maids: [], isPronounFollowUp: false }

  if (isMaidCardListQuestion(message)) {
    return { maids: pickRelevantMaidRecords(message, maids), isPronounFollowUp: false }
  }

  const currentMaid = findMaidFromReference(currentMaidReference, maids)
  if (currentMaid) return { maids: [currentMaid], isPronounFollowUp: false }

  const mentionedMaid = findMaidMentionedInMessage(message, maids)
  if (mentionedMaid) return { maids: [mentionedMaid], isPronounFollowUp: false }

  if (isPronounFollowUpQuestion(message) && conversationId) {
    const lastReference = getLastDiscussedMaidReference(conversationId)
    if (lastReference) {
      const lastDiscussed = findMaidFromReference(lastReference, maids)
      if (lastDiscussed) return { maids: [lastDiscussed], isPronounFollowUp: true }
    }
  }

  if (isMaidProfileQuestion(message)) {
    return { maids: pickRelevantMaidRecords(message, maids), isPronounFollowUp: false }
  }
  return { maids: [], isPronounFollowUp: false }
}

export const receptionist = async (req: Request, res: Response) => {
  try {
    const message = requiredString(req.body.message, 'message')
    const conversationId = optionalString(req.body.conversationId, 120) || randomUUID()
    const currentMaidReference = extractMaidReferenceFromPath(req.body.currentPath)
    const conversationHistory = Array.isArray(req.body.history)
      ? req.body.history
          .filter((msg: unknown) => msg && typeof msg === 'object' && 'role' in msg && 'content' in msg)
          .map((msg: { role: string; content: string }) => ({ role: msg.role, content: msg.content }))
          .slice(-12)
      : []
    const [maids, companyBundle] = await Promise.all([
      getAllMaidsStore(undefined, 'public'),
      getCompanyBundle().catch(() => null),
    ])
    const companyProfile = companyBundle?.companyProfile ?? null
    const relevantFaqs = findRelevantFaqs(message)

    const isFeeQuestion = isFeeOrPricingQuestion(message)

    const featuredMaidRecords =
      !isFeeQuestion && shouldShowMaidCards(message) ? pickFeaturedMaidRecords(message, maids) : []
    const featuredMaids = featuredMaidRecords.map(toFeaturedMaid)
    const requestedCount = extractRequestedCount(message)

    const namedMaidResolution = !isFeeQuestion
      ? pickRelevantMaidRecordsForMessage(message, maids, currentMaidReference, conversationId)
      : { maids: [], isPronounFollowUp: false }
    const namedMaid = namedMaidResolution.maids
    const isResolvedPronounFollowUp = namedMaidResolution.isPronounFollowUp

    // A list reply and its visual cards must always describe the exact same
    // records. Previously this used a separate relevant-maid search (limit 8),
    // while cards used their own limit (up to 10), allowing text/card mismatch.
    const relevantMaids = isFeeQuestion
      ? []
      : featuredMaidRecords.length > 0
      ? featuredMaidRecords
      : namedMaid

    const canUseAiResponse =
      relevantMaids.length > 0 ||
      isResolvedPronounFollowUp ||
      !(isMaidProfileQuestion(message) && relevantMaids.length === 0)
    const aiResponse = canUseAiResponse
      ? await callGroqReceptionist({
          message,
          relevantFaqs,
          relevantMaids,
          featuredMaids,
          companyProfile,
          allMaids: maids,
          isPronounFollowUp: isResolvedPronounFollowUp,
        }).catch(() => null)
      : null

    const isSingleProfileQuestion =
      !isFeeQuestion &&
      relevantMaids.length === 1 &&
      !FEE_QUESTION_PATTERN.test(message)

    const isCardListMissingMaids =
      !isFeeQuestion &&
      featuredMaidRecords.length > 0 &&
      !isSingleProfileQuestion &&
      (!aiResponse || featuredMaidRecords.some((maid) => !aiResponse.includes(maid.referenceCode)))

    if (isSingleProfileQuestion && !aiResponse) {
      console.warn('[receptionist] Groq returned null for single profile question — using buildSingleMaidIntro fallback')
    }

    const synchronizedMaidResponse = isSingleProfileQuestion
      ? aiResponse || (isResolvedPronounFollowUp ? null : buildMaidCardIntro(relevantMaids))
      : isCardListMissingMaids
      ? buildMaidCardIntro(featuredMaidRecords)
      : aiResponse

    const baseResponse =
      synchronizedMaidResponse ||
      (await fallbackReceptionistResponse(message, relevantFaqs, featuredMaids, relevantMaids, companyProfile, conversationHistory)) ||
      "I'm here to help with helper recommendations, hiring questions, and company details. How can I assist you?"

    const hasFewerThanRequested =
      requestedCount !== null &&
      shouldShowMaidCards(message) &&
      featuredMaidRecords.length < requestedCount
    const availabilityNotice = hasFewerThanRequested
      ? featuredMaidRecords.length > 0
        ? `We currently have only ${featuredMaidRecords.length} ${describeRequestedMaidGroup(message)}${featuredMaidRecords.length === 1 ? '' : 's'} available, so I have listed all of them below.`
        : `We currently do not have any ${describeRequestedMaidGroup(message)}s available.`
      : ''
    const response = availabilityNotice
      ? `${availabilityNotice}\n\n${baseResponse}`
      : baseResponse

    if (relevantMaids.length === 1) {
      setLastDiscussedMaidReference(conversationId, relevantMaids[0]!.referenceCode)
    } else if (featuredMaids.length === 1) {
      setLastDiscussedMaidReference(conversationId, featuredMaids[0]!.referenceCode)
    }

    res.status(200).json({
      conversationId,
      response: formatMoneyText(String(response)),
      featuredMaids,
    })
  } catch (error) {
    console.error('[receptionist] handler error:', error)
    const message =
      error instanceof Error ? error.message : 'The receptionist is unavailable right now.'
    const status = /required/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const processInquiry = async (req: Request, res: Response) => {
  try {
    const requestId = optionalString(req.body.requestId, 120) || randomUUID()
    const result = await processInquiryWithAiOrchestrator({
      requestId,
      message: requiredString(req.body.message, 'message'),
      name: optionalString(req.body.name, 200) || 'Unknown',
      contact: optionalString(req.body.contact, 200) || '',
      employerId:
        req.body.employerId === undefined
          ? undefined
          : positiveInteger(req.body.employerId, 'employerId'),
    })

    const responseBody = {
      ...result,
      inquiry: {
        ...result.inquiry,
        workflow: normalizeWorkflow(result.inquiry.workflow),
      },
      workflow: normalizeWorkflow(result.workflow),
      classifier: {
        ...result.classifier,
        workflow: normalizeWorkflow(result.classifier.workflow),
      },
    }

    const envelope = buildWorkflowResponse({
      workflow: responseBody.workflow,
      intent: responseBody.inquiry.intent,
      fallbackUsed: responseBody.fallbackUsed,
      fallbackProvider: responseBody.fallbackProvider,
      data: responseBody,
    })

    assertNoLegacyWorkflowResponse(
      envelope,
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    )

    res.status(200).json(envelope)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process inquiry'
    const status = /required|positive integer/i.test(message) ? 400 : 500
    res.status(status).json(
      buildWorkflowResponse({
        workflow: 'validation_error',
        intent: 'validation_error',
        fallbackUsed: true,
        data: { error: message },
      })
    )
  }
}

