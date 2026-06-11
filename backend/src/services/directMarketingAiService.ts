import { randomUUID } from 'crypto'
import {
  getAllMaidsStore,
  getClientsStore,
  getCompanyBundle,
  getDirectSalesStore,
  getEnquiriesStore,
  type MaidRecord,
} from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignGoal =
  | 'new_arrivals'
  | 're_engage'
  | 'promotion'
  | 'holiday'
  | 'follow_up'
  | 'custom'

export type CampaignTone = 'professional' | 'warm' | 'urgent' | 'casual'

export type AudienceType =
  | 'all_clients'
  | 'enquiry_leads'
  | 'direct_sale_leads'
  | 'all_contacts'

export interface MarketingContact {
  id: string
  name: string
  phone: string
  email: string
  source: 'client' | 'enquiry' | 'direct_sale'
}

export interface MarketingMessage {
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactSource: string
  message: string
  whatsappLink: string
}

export interface MarketingCampaign {
  id: string
  agencyId: number
  goal: CampaignGoal
  tone: CampaignTone
  maidReferences: string[]
  audienceType: AudienceType
  messageTemplate: string
  messages: MarketingMessage[]
  contactCount: number
  generatedAt: string
  aiUsed: boolean
}

// ─── In-memory campaign store (last 20 per agency) ────────────────────────────

const campaignsByAgency = new Map<number, MarketingCampaign[]>()

export const saveCampaignToMemory = (campaign: MarketingCampaign) => {
  const existing = campaignsByAgency.get(campaign.agencyId) ?? []
  const updated = [campaign, ...existing].slice(0, 20)
  campaignsByAgency.set(campaign.agencyId, updated)
}

export const getCampaignsByAgency = (agencyId: number): MarketingCampaign[] =>
  campaignsByAgency.get(agencyId) ?? []

// ─── Helpers ──────────────────────────────────────────────────────────────────

const firstDefinedEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return ''
}

const buildWhatsAppLink = (phone: string, message: string): string => {
  if (!phone?.trim()) return ''
  const hasPlus = phone.trimStart().startsWith('+')
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (!hasPlus && digits.length === 9 && digits.startsWith('0')) digits = digits.slice(1)
  if (!hasPlus && digits.length === 8) digits = `65${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

const goalLabel = (goal: CampaignGoal): string => ({
  new_arrivals: 'promote newly arrived and available domestic helpers',
  re_engage: 're-engage past clients who previously showed interest',
  promotion: 'announce a special promotion or limited offer',
  holiday: 'send a festive greeting and helper availability update',
  follow_up: 'follow up on a previous inquiry or pending placement',
  custom: 'send a personalized outreach message',
}[goal])

const toneLabel = (tone: CampaignTone): string => ({
  professional: 'formal and professional',
  warm: 'friendly and warm',
  urgent: 'urgent and action-oriented',
  casual: 'casual and conversational',
}[tone])

const describeMaid = (maid: MaidRecord): string => {
  const intro = maid.introduction as Record<string, unknown> | undefined
  const salary = (intro?.expectedSalary as string | undefined) ?? ''
  const availability = (intro?.availability as string | undefined) ?? 'available now'
  const skills = Object.entries(maid.workAreas ?? {})
    .filter(([, v]) => {
      const cfg = v as Record<string, unknown>
      return cfg?.willing || cfg?.experience
    })
    .map(([area]) => area)
    .slice(0, 3)
    .join(', ')

  return [
    `${maid.fullName} (${maid.referenceCode})`,
    `${maid.nationality} – ${maid.type}`,
    skills ? `Skills: ${skills}` : '',
    salary ? `Expected salary: ${salary}` : '',
    `Availability: ${availability}`,
  ]
    .filter(Boolean)
    .join(' | ')
}

// ─── AI generation ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert WhatsApp marketing copywriter for a Singapore domestic helper (maid) agency.
Your job is to craft concise, compelling outreach messages that feel personal and human — not spammy.

Rules:
- Start with: Hi {{name}},
- Keep total length under 350 characters
- Feature the specific helpers provided — mention name, nationality, and 1-2 top skills
- Always end with the agency's WhatsApp number or a CTA to contact the agency
- Match the tone requested exactly
- Use simple everyday English, no jargon
- Never make false guarantees
- For Singapore context: use $ not S$, mention "transfer helper" or "new helper" where relevant
- Return ONLY valid JSON with shape: {"template": "...", "subject": "..."}
  where template uses {{name}} as the client name placeholder and {{agencyPhone}} for the contact number`

const generateWithClaude = async (userPrompt: string): Promise<{ template: string; subject: string } | null> => {
  const apiKey = firstDefinedEnv('ANTHROPIC_API_KEY', 'CLAUDE_API_KEY')
  if (!apiKey) return null

  const model = firstDefinedEnv('ANTHROPIC_MODEL', 'CLAUDE_MODEL') || 'claude-3-5-haiku-latest'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!response.ok) return null
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const text = data.content?.find((b) => b.type === 'text')?.text?.trim() ?? ''
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) return null
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    if (typeof parsed.template === 'string') {
      return { template: parsed.template, subject: String(parsed.subject ?? 'Helper Availability Update') }
    }
    return null
  } catch {
    clearTimeout(timeout)
    return null
  }
}

const generateWithGroq = async (userPrompt: string): Promise<{ template: string; subject: string } | null> => {
  const apiKey = firstDefinedEnv('GROQ_API_KEY', 'AI_RECEPTIONIST_API_KEY')
  if (!apiKey) return null

  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!response.ok) return null
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content?.trim() ?? ''
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) return null
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    if (typeof parsed.template === 'string') {
      return { template: parsed.template, subject: String(parsed.subject ?? 'Helper Availability Update') }
    }
    return null
  } catch {
    clearTimeout(timeout)
    return null
  }
}

const buildFallbackTemplate = (
  goal: CampaignGoal,
  maids: MaidRecord[],
  agencyName: string
): string => {
  const maidLine = maids
    .slice(0, 2)
    .map((m) => `${m.fullName} (${m.nationality}, ${m.type})`)
    .join(' & ')

  const goalLines: Record<CampaignGoal, string> = {
    new_arrivals: `We have new helpers just arrived! ${maidLine || 'Great profiles available now'}.`,
    re_engage: `We'd love to help you find the right helper. ${maidLine || 'We have great options available'}.`,
    promotion: `Special offer available now. ${maidLine || 'New and transfer helpers ready'}.`,
    holiday: `Season's greetings! We have helpers ready to assist your family. ${maidLine || 'Available now'}.`,
    follow_up: `Following up on your recent inquiry. ${maidLine || 'We have helpers that may suit your needs'}.`,
    custom: `${maidLine || 'We have excellent domestic helpers available'}.`,
  }

  return `Hi {{name}}, ${goalLines[goal]} Contact us to find out more — ${agencyName} is here to help! Reply to this message or call us at {{agencyPhone}}.`
}

// ─── Audience builders ────────────────────────────────────────────────────────

const dedupeContacts = (contacts: MarketingContact[]): MarketingContact[] => {
  const seen = new Set<string>()
  return contacts.filter((c) => {
    const key = c.phone?.trim().replace(/\D/g, '') || c.email?.trim().toLowerCase() || c.id
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const buildAudience = async (
  audienceType: AudienceType,
  agencyId: number
): Promise<MarketingContact[]> => {
  const contacts: MarketingContact[] = []

  const includeClients = audienceType === 'all_clients' || audienceType === 'all_contacts'
  const includeEnquiries = audienceType === 'enquiry_leads' || audienceType === 'all_contacts'
  const includeDirectSales = audienceType === 'direct_sale_leads' || audienceType === 'all_contacts'

  const [clients, enquiries, directSales] = await Promise.all([
    includeClients ? getClientsStore() : Promise.resolve([]),
    includeEnquiries ? getEnquiriesStore(undefined, agencyId) : Promise.resolve([]),
    includeDirectSales ? getDirectSalesStore(agencyId) : Promise.resolve([]),
  ])

  for (const c of clients) {
    contacts.push({
      id: `client-${c.id}`,
      name: c.name?.trim() || c.email,
      phone: c.phone?.trim() || '',
      email: c.email?.trim() || '',
      source: 'client',
    })
  }

  for (const e of enquiries) {
    contacts.push({
      id: `enquiry-${e.id}`,
      name: e.clientName?.trim() || e.username?.trim() || e.email,
      phone: e.phone?.trim() || '',
      email: e.email?.trim() || '',
      source: 'enquiry',
    })
  }

  const seenDirectIds = new Set<number>()
  for (const ds of directSales) {
    if (ds.clientId && seenDirectIds.has(ds.clientId)) continue
    if (ds.clientId) seenDirectIds.add(ds.clientId)
    contacts.push({
      id: `direct-${ds.id}`,
      name: ds.clientName?.trim() || ds.clientEmail || 'Client',
      phone: ds.clientPhone?.trim() || '',
      email: ds.clientEmail?.trim() || '',
      source: 'direct_sale',
    })
  }

  return dedupeContacts(contacts)
}

// ─── Main generation function ─────────────────────────────────────────────────

export const generateMarketingCampaign = async (params: {
  agencyId: number
  goal: CampaignGoal
  tone: CampaignTone
  maidReferences: string[]
  audienceType: AudienceType
  customNote?: string
}): Promise<MarketingCampaign> => {
  const [allMaids, companyBundle, contacts] = await Promise.all([
    getAllMaidsStore(undefined, 'public'),
    getCompanyBundle().catch(() => null),
    buildAudience(params.audienceType, params.agencyId),
  ])

  const companyProfile = companyBundle?.companyProfile ?? null
  const agencyName = companyProfile?.company_name || companyProfile?.short_name || 'Our Agency'
  const agencyPhone =
    companyProfile?.social_whatsapp_number?.trim() ||
    companyProfile?.contact_phone?.trim() ||
    ''

  const selectedMaids = params.maidReferences.length > 0
    ? allMaids.filter((m) => params.maidReferences.includes(m.referenceCode) && m.isPublic)
    : allMaids.filter((m) => m.isPublic).slice(0, 3)

  const maidContext = selectedMaids.map(describeMaid).join('\n')

  const userPrompt = [
    `Goal: ${goalLabel(params.goal)}`,
    `Tone: ${toneLabel(params.tone)}`,
    `Agency name: ${agencyName}`,
    `Agency contact: ${agencyPhone || 'our agency number'}`,
    '',
    'Featured domestic helpers:',
    maidContext || '(No specific helpers selected — write a general availability message)',
    '',
    params.customNote?.trim() ? `Additional instruction: ${params.customNote.trim()}` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')

  let aiResult: { template: string; subject: string } | null = null
  let aiUsed = false

  aiResult = await generateWithClaude(userPrompt).catch(() => null)
  if (aiResult) {
    aiUsed = true
  } else {
    aiResult = await generateWithGroq(userPrompt).catch(() => null)
    if (aiResult) aiUsed = true
  }

  const template = aiResult?.template ?? buildFallbackTemplate(params.goal, selectedMaids, agencyName)

  const messages: MarketingMessage[] = contacts.map((contact) => {
    const personalized = template
      .replace(/\{\{name\}\}/g, contact.name || 'there')
      .replace(/\{\{agencyPhone\}\}/g, agencyPhone || agencyName)

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email,
      contactSource: contact.source,
      message: personalized,
      whatsappLink: contact.phone ? buildWhatsAppLink(contact.phone, personalized) : '',
    }
  })

  const campaign: MarketingCampaign = {
    id: randomUUID(),
    agencyId: params.agencyId,
    goal: params.goal,
    tone: params.tone,
    maidReferences: params.maidReferences,
    audienceType: params.audienceType,
    messageTemplate: template,
    messages,
    contactCount: contacts.length,
    generatedAt: new Date().toISOString(),
    aiUsed,
  }

  saveCampaignToMemory(campaign)
  return campaign
}
