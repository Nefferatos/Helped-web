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

const ANSWER_KEYWORDS = [
  'salary',
  'salaries',
  'range',
  'ranges',
  'hire',
  'hired',
  'hiring',
  'fee',
  'fees',
  'cost',
  'costs',
  'price',
  'pricing',
  'levy',
  'insurance',
  'document',
  'documents',
  'obligation',
  'obligations',
  'mom',
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
  'Rinzin Agency has been trusted since 2005 and places domestic helpers with families in Singapore and internationally.',
  "The agency specialises in carefully selected domestic helpers from North East India, the Philippines, Myanmar, and beyond, matched to each family's needs.",
  'In 2005, as a Singaporean Chinese who had travelled India widely, the agency became the first to introduce helpers from Lahaul and Spiti, Himachal Pradesh, and Ladakh to Singapore families.',
  'RINZIN has been providing quality Indian, Filipino, and Myanmar domestic helpers to Singapore families for many years, building a wider choice of helper origins and backgrounds.',
  'The agency deals with real people from different cultures and aims to face and solve problems swiftly.',
  'Its policy line is: The right worker, delivered on time.',
  'Core expertise includes North East Indian helpers such as Darjeeling and Sikkim maids, Nepalese Hindu helpers, Tibetan Buddhist helpers, Manipur English-speaking helpers, plus Filipino helpers with video interviews available and Myanmar helpers.',
  'Placement origins include North East Indian, Filipino, Myanmar, South Indian, Indonesian, Punjabi, Lahaul and Spiti, Himachal Pradesh, and Ladakh helpers.',
  'The agency highlights verified and screened helpers, cultural matching for language, diet, and religious background, SMS crisis support, and pioneer experience since 2005.',
  'The agency also serves international clients by relocating fresh and experienced helpers to reputable clients in Europe and the UK.',
].join('\n')

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

const CARD_REQUEST_PATTERN =
  /\b(show|find|recommend|match|shortlist|available|availability|who|which|suitable|helper|helpers|maid|maids|fdw|filipino|indonesian|myanmar|burmese|indian|sri lankan|bangladeshi|transfer|elderly|childcare|infant|disabled|housework|cooking)\b/i

const CARD_LIST_REQUEST_PATTERN =
  /\b(top|best|show|find|recommend|match|shortlist|list|available|availability|who|which|suitable)\b/i

const MAID_PROFILE_REQUEST_PATTERN =
  /\b(background|profile|bio|biodata|experience|history|introduction|intro|details|tell me about|information|info)\b/i

const MAID_TOPIC_PATTERN =
  /\b(maid|maids|helper|helpers|fdw|filipino|indonesian|myanmar|burmese|indian|sri lankan|bangladeshi|transfer|elderly|childcare|infant|disabled|housework|cooking|cook)\b/i

const FEE_QUESTION_PATTERN = /\b(fee|fees|cost|costs|price|pricing|salary|salaries|levy|loan|insurance)\b/i

const OFF_TOPIC_PATTERN =
  /\b(weather|sports|football|basketball|movie|movies|song|joke|recipe|coding|programming|homework|math|bitcoin|crypto|stock|stocks|politics|president|news)\b/i

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
  OFF_TOPIC_PATTERN.test(message) && !isCompanyQuestion(message) && !isMaidSearchQuestion(message)

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

const extractMaidReferenceFromPath = (value: unknown) => {
  const path = String(value ?? '').trim()
  const match = path.match(/\/maids\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1] ?? '').trim() : ''
}

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

const describeMaidForPrompt = (maid: MaidRecord) => {
  const intro = asRecord(maid.introduction)
  const skills = asRecord(maid.skillsPreferences)
  const languageSkills = Object.entries(maid.languageSkills ?? {})
    .filter(([, level]) => String(level ?? '').trim())
    .map(([language, level]) => `${language}: ${String(level)}`)
    .join(', ')
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
    `Public intro: ${compactList(intro.publicIntro) || 'N/A'}`,
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

const pickFeaturedMaids = (message: string, maids: MaidRecord[]) => {
  const terms = normalizeTerms(message)

  const publicMaids = maids.filter((maid) => maid.isPublic && isDisplayablePublicMaid(maid))
  const scored = publicMaids.map((maid) => {
    const score = scoreMaid(maid, terms)
    return { maid, score }
  })

  return scored
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((left, right) => right.score - left.score || right.maid.id - left.maid.id)
    .slice(0, FEATURED_MAID_CARD_LIMIT)
    .map(({ maid }) => toFeaturedMaid(maid))
}

const shouldShowMaidCards = (message: string) => {
  return isMaidCardListQuestion(message) && !isCompanyQuestion(message)
}

const fallbackReceptionistResponse = (
  message: string,
  relevantFaqs: Array<{ q: string; a: string }>,
  featuredMaids: ReturnType<typeof pickFeaturedMaids>,
  relevantMaids: MaidRecord[],
  companyProfile: CompanyProfileRecord | null
) => {
  if (isOffTopicQuestion(message)) {
    return "I'm sorry, I can only help with our maid agency services, company details, hiring questions, and available public maid profiles."
  }

  if (isCompanyQuestion(message) && companyProfile) {
    const lines = isAgencyBackgroundQuestion(message)
      ? [
          companyProfile.company_name || companyProfile.short_name,
          ABOUT_US_PAGE_CONTEXT,
          companyProfile.about_us ? `Additional company note: ${companyProfile.about_us}` : '',
        ]
      : [
      companyProfile.company_name || companyProfile.short_name,
      companyProfile.license_no ? `License: ${companyProfile.license_no}` : '',
      [companyProfile.address_line1, companyProfile.address_line2, companyProfile.postal_code, companyProfile.country]
        .filter(Boolean)
        .join(', '),
      companyProfile.contact_phone ? `Phone: ${companyProfile.contact_phone}` : '',
      companyProfile.contact_email ? `Email: ${companyProfile.contact_email}` : '',
      companyProfile.contact_website ? `Website: ${companyProfile.contact_website}` : '',
      companyProfile.office_hours_regular ? `Office hours: ${companyProfile.office_hours_regular}` : '',
      companyProfile.about_us ? companyProfile.about_us : '',
        ]
    .filter(Boolean)

    return formatMoneyText(lines.join('\n'))
  }

  if (relevantFaqs.length > 0) {
    return formatMoneyText(relevantFaqs
      .map((faq) => `${faq.a}`)
      .join('\n\n')
      .slice(0, 900))
  }

  if (relevantMaids.length > 0) {
    return formatMoneyText(relevantMaids
      .slice(0, 5)
      .map((maid) => {
        const intro = asRecord(maid.introduction)
        const expectedSalary = compactList(intro.expectedSalary)
        const publicIntro = compactList(intro.publicIntro)
        const workAreas = describeWorkAreas(maid)
        return [
          `${maid.fullName} (${maid.referenceCode}) is a ${maid.nationality || 'helper'}${
            maid.type ? `, ${maid.type}` : ''
          }.`,
          expectedSalary ? `Expected salary: ${expectedSalary}.` : '',
          workAreas ? `Skills: ${workAreas}.` : '',
          publicIntro ? `Note: ${publicIntro}.` : '',
        ]
          .filter(Boolean)
          .join(' ')
      })
      .join('\n\n')
      .slice(0, 900))
  }

  if (isMaidProfileQuestion(message)) {
    return 'Sure, I can help with a maid profile background. Please share the maid name or reference code, or open the maid profile page and ask me again from there.'
  }

  if (featuredMaids.length > 0) {
    const names = featuredMaids.map((maid) => `${maid.fullName} (${maid.referenceCode})`).join(', ')
    return `I found the top ${featuredMaids.length} available public helpers that may fit: ${names}. You can review their profile cards below.`
  }

  return "I can help with helper recommendations, maid skills, company details, salary ranges, levy, fees, documents, insurance, MOM obligations, and hiring questions. Tell me what you need and I'll answer from our available information."
}

const callGroqReceptionist = async (params: {
  message: string
  relevantFaqs: Array<{ q: string; a: string }>
  relevantMaids: MaidRecord[]
  featuredMaids: ReturnType<typeof pickFeaturedMaids>
  companyProfile: CompanyProfileRecord | null
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
      max_tokens: 450,
      messages: [
        {
          role: 'system',
          content:
            'You are the AI Receptionist for a Singapore maid agency. Answer naturally and directly using only the supplied FAQ, company, and public maid profile context. If the user asks about a maid background, biodata, experience, or profile details, answer from the public maid profile context in text only. If the user asks about fees, costs, salary, levy, loan, or insurance, answer in text only and do not suggest profile cards. Mention profile cards only when profile cards are provided for an explicit list, top, show, find, recommend, match, shortlist, or availability request. If the question is not about the company, maid profiles, or hiring helpers, politely say you can only help with those topics. If exact agency fees are not supplied, say the team can confirm agency fees instead of inventing numbers. Keep answers concise and helpful.',
        },
        {
          role: 'user',
          content: [
            `Customer question: ${params.message}`,
            `FAQ context:\n${faqContext}`,
            `Company context:\n${companyContext}`,
            `Public maid profile context:\n${maidContext}`,
            `Profile cards available: ${
              params.featuredMaids.length > 0
                ? params.featuredMaids
                    .map((maid) => `${maid.fullName} (${maid.referenceCode})`)
                    .join(', ')
                : 'none'
            }`,
          ].join('\n\n'),
        },
      ],
    }),
  })

  if (!response.ok) return null
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}

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

const findMaidFromReference = (referenceCode: string, maids: MaidRecord[]) => {
  const normalized = referenceCode.trim().toLowerCase()
  if (!normalized) return null
  return (
    maids.find((maid) => maid.isPublic && maid.referenceCode.toLowerCase() === normalized) ??
    maids.find((maid) => maid.isPublic && maid.referenceCode.toLowerCase().includes(normalized)) ??
    null
  )
}

const pickRelevantMaidRecordsForMessage = (
  message: string,
  maids: MaidRecord[],
  currentMaidReference: string
) => {
  const currentMaid = findMaidFromReference(currentMaidReference, maids)
  if (currentMaid && isMaidProfileQuestion(message)) return [currentMaid]
  if (isMaidCardListQuestion(message) || isMaidProfileQuestion(message)) return pickRelevantMaidRecords(message, maids)
  return []
}

const shouldAnswerWithProfiles = (message: string) =>
  isMaidCardListQuestion(message) || isMaidProfileQuestion(message)

export const receptionist = async (req: Request, res: Response) => {
  try {
    const message = requiredString(req.body.message, 'message')
    const conversationId = optionalString(req.body.conversationId, 120) || randomUUID()
    const currentMaidReference = extractMaidReferenceFromPath(req.body.currentPath)
    const [maids, companyBundle] = await Promise.all([
      getAllMaidsStore(undefined, 'public'),
      getCompanyBundle().catch(() => null),
    ])
    const companyProfile = companyBundle?.companyProfile ?? null
    const relevantFaqs = isOffTopicQuestion(message) ? [] : findRelevantFaqs(message)
    const featuredMaids = shouldShowMaidCards(message) ? pickFeaturedMaids(message, maids) : []
    const relevantMaids = shouldAnswerWithProfiles(message)
      ? pickRelevantMaidRecordsForMessage(message, maids, currentMaidReference)
      : []

    const canUseAiResponse = !(isMaidProfileQuestion(message) && relevantMaids.length === 0)
    const aiResponse = canUseAiResponse
      ? await callGroqReceptionist({
          message,
          relevantFaqs,
          relevantMaids,
          featuredMaids,
          companyProfile,
        }).catch(() => null)
      : null
    const response =
      aiResponse || fallbackReceptionistResponse(message, relevantFaqs, featuredMaids, relevantMaids, companyProfile)

    res.status(200).json({
      conversationId,
      response: formatMoneyText(response),
      featuredMaids,
    })
  } catch (error) {
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
