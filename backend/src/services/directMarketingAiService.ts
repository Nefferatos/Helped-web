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
  charCount: number
  whatsappReady: boolean
}

export interface MarketingCampaign {
  id: string
  agencyId: number
  goal: CampaignGoal
  tone: CampaignTone
  maidReferences: string[]
  audienceType: AudienceType
  messageTemplate: string
  subject: string
  messages: MarketingMessage[]
  contactCount: number
  whatsappReadyCount: number
  emailOnlyCount: number
  generatedAt: string
  aiUsed: boolean
}

// ─── In-memory campaign store (last 20 per agency) ────────────────────────────

const campaignsByAgency = new Map<number, MarketingCampaign[]>()

export const saveCampaignToMemory = (campaign: MarketingCampaign) => {
  const existing = campaignsByAgency.get(campaign.agencyId) ?? []
  campaignsByAgency.set(campaign.agencyId, [campaign, ...existing].slice(0, 20))
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

const goalMeta = (goal: CampaignGoal) => ({
  new_arrivals: {
    intent: 'promote newly arrived and available domestic helpers to potential clients',
    hook: 'New helpers have just arrived!',
    emoji: '✨',
    subject: 'New Helpers Available',
  },
  re_engage: {
    intent: 're-engage past clients and enquiry leads who have not converted yet',
    hook: 'We still have excellent helpers ready for you.',
    emoji: '👋',
    subject: 'Still Looking for a Helper?',
  },
  promotion: {
    intent: 'announce a special promotion, discounted placement fee, or limited-time offer',
    hook: 'Special offer — limited slots available!',
    emoji: '🎉',
    subject: 'Special Offer for You',
  },
  holiday: {
    intent: 'send warm festive greetings while highlighting helper availability',
    hook: "Season's greetings from our family to yours!",
    emoji: '🎊',
    subject: 'Festive Greetings & Helper Availability',
  },
  follow_up: {
    intent: 'follow up warmly on a previous enquiry, pending placement, or unanswered message',
    hook: 'Just following up — we would love to help!',
    emoji: '🔔',
    subject: 'Following Up on Your Enquiry',
  },
  custom: {
    intent: 'send a personalized outreach message based on the additional instructions provided',
    hook: 'We have something for you.',
    emoji: '💬',
    subject: 'Message from Our Agency',
  },
}[goal])

const toneGuide = (tone: CampaignTone): string => ({
  professional: 'formal, polished, and respectful — no emojis, complete sentences, no contractions',
  warm: 'friendly, caring, and genuine — 1-2 emojis only, conversational but tasteful',
  urgent: 'direct, action-oriented, and time-sensitive — one strong emoji, short punchy sentences',
  casual: 'relaxed, chatty, and approachable — natural language, one emoji, feels like a friend texting',
}[tone])

const describeMaid = (maid: MaidRecord): string => {
  const intro = maid.introduction as Record<string, unknown> | undefined
  const salary = (intro?.expectedSalary as string | undefined)?.replace(/S\$/g, '$').trim() ?? ''
  const availability = (intro?.availability as string | undefined) ?? 'available now'

  const topSkills = Object.entries(maid.workAreas ?? {})
    .filter(([, v]) => {
      const cfg = v as Record<string, unknown>
      return cfg?.experience || cfg?.willing
    })
    .sort(([, a], [, b]) => {
      const score = (v: unknown) => {
        const cfg = v as Record<string, unknown>
        const ev = String(cfg?.evaluation ?? '').toLowerCase()
        if (/excellent/i.test(ev)) return 4
        if (/very good/i.test(ev)) return 3
        if (cfg?.experience) return 2
        return 1
      }
      return score(b) - score(a)
    })
    .slice(0, 2)
    .map(([area]) => area)
    .join(' & ')

  return [
    `Name: ${maid.fullName} | Ref: ${maid.referenceCode}`,
    `Nationality: ${maid.nationality} | Type: ${maid.type}`,
    topSkills ? `Top skills: ${topSkills}` : '',
    salary ? `Expected salary: ${salary}/mth` : '',
    `Availability: ${availability}`,
  ].filter(Boolean).join('\n')
}

// ─── AI generation ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a WhatsApp marketing expert for a Singapore domestic helper agency.
Write ONE outreach message template for sending to potential clients.

FORMAT RULES (strict):
- Open exactly with: Hi {{name}},
- One blank line, then the hook/body (2-4 short sentences max)
- End with a CTA that includes {{agencyPhone}}
- Total: 200-300 characters maximum (count carefully — WhatsApp previews cut off long messages)
- Singapore context: use $ not S$, "transfer helper" / "new helper"
- 1-2 relevant emojis only (0 for professional tone)
- Use {{name}} for client name, {{agencyPhone}} for contact number

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown:
{"template": "Hi {{name}},\\n\\nYour message here. CTA with {{agencyPhone}}.", "subject": "Short email subject line"}`

const parseAiJson = (text: string): { template: string; subject: string } | null => {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace <= firstBrace) return null
  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    if (typeof parsed.template === 'string' && parsed.template.includes('{{name}}')) {
      return { template: parsed.template, subject: String(parsed.subject ?? 'Helper Update') }
    }
    return null
  } catch {
    return null
  }
}

const generateWithClaude = async (userPrompt: string): Promise<{ template: string; subject: string } | null> => {
  const apiKey = firstDefinedEnv('ANTHROPIC_API_KEY', 'CLAUDE_API_KEY')
  if (!apiKey) return null
  const model = firstDefinedEnv('ANTHROPIC_MODEL', 'CLAUDE_MODEL') || 'claude-3-5-haiku-latest'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 14000)
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
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find((b) => b.type === 'text')?.text?.trim() ?? ''
    return parseAiJson(text)
  } catch {
    clearTimeout(timeout)
    return null
  }
}

const generateWithGroq = async (userPrompt: string): Promise<{ template: string; subject: string } | null> => {
  const apiKey = firstDefinedEnv('GROQ_API_KEY', 'AI_RECEPTIONIST_API_KEY')
  if (!apiKey) return null
  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 14000)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content?.trim() ?? ''
    return parseAiJson(text)
  } catch {
    clearTimeout(timeout)
    return null
  }
}

const buildFallbackTemplate = (
  goal: CampaignGoal,
  tone: CampaignTone,
  maids: MaidRecord[],
  agencyName: string,
  agencyPhone: string,
): string => {
  const meta = goalMeta(goal)
  const emoji = tone === 'professional' ? '' : meta.emoji + ' '
  const contact = agencyPhone || agencyName

  const maidHighlight = maids.slice(0, 2)
    .map((m) => {
      const topSkill = Object.entries(m.workAreas ?? {})
        .filter(([, v]) => (v as Record<string, unknown>)?.experience)
        .map(([area]) => area)[0]
      return `${m.fullName} (${m.nationality}${topSkill ? `, ${topSkill}` : ''})`
    })
    .join(' and ')

  const bodies: Record<CampaignGoal, string> = {
    new_arrivals: maidHighlight
      ? `${emoji}${maidHighlight} ${maids.length > 2 ? 'and more are' : 'is'} now available. Experienced, verified, and ready to start soon.`
      : `${emoji}We have new verified helpers available now. Let us help you find the perfect match for your family.`,
    re_engage: `${emoji}We noticed you enquired with us before. We still have excellent helpers available and would love to assist you.`,
    promotion: `${emoji}Limited slots this month — reduced placement fees for new clients. ${maidHighlight ? `${maidHighlight} available now.` : 'Great helpers ready to start.'}`,
    holiday: `${emoji}Warmest greetings from ${agencyName}! We have helpers available over the festive season. ${maidHighlight || 'Many profiles to choose from.'}`,
    follow_up: `${emoji}Just following up on your earlier enquiry. ${maidHighlight ? `${maidHighlight} is still available.` : 'We still have great helpers ready for you.'}`,
    custom: `${emoji}${maidHighlight ? `${maidHighlight} — available now.` : `We have excellent domestic helpers available.`} Contact us to find out more.`,
  }

  return `Hi {{name}},\n\n${bodies[goal]}\n\nReply here or WhatsApp us at {{agencyPhone}} — ${agencyName}.`
    .replace('{{agencyPhone}}', contact)
    .replace('{{agencyPhone}}', contact)
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

// ─── Main generation ──────────────────────────────────────────────────────────

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

  const meta = goalMeta(params.goal)

  const userPrompt = [
    `Campaign goal: ${meta.intent}`,
    `Tone: ${toneGuide(params.tone)}`,
    `Agency name: ${agencyName}`,
    `Agency WhatsApp / phone: ${agencyPhone || 'our agency number'}`,
    '',
    'Featured domestic helpers (include 1-2 names and 1 skill each in the message):',
    selectedMaids.length > 0
      ? selectedMaids.map(describeMaid).join('\n\n')
      : '(No specific helpers provided — write a compelling general availability message)',
    '',
    params.customNote?.trim()
      ? `Special instruction from agency: ${params.customNote.trim()}`
      : '',
  ].filter((l) => l !== undefined).join('\n')

  let aiResult: { template: string; subject: string } | null = null
  let aiUsed = false

  aiResult = await generateWithClaude(userPrompt).catch(() => null)
  if (aiResult) {
    aiUsed = true
  } else {
    aiResult = await generateWithGroq(userPrompt).catch(() => null)
    if (aiResult) aiUsed = true
  }

  const template = aiResult?.template
    ?? buildFallbackTemplate(params.goal, params.tone, selectedMaids, agencyName, agencyPhone)
  const subject = aiResult?.subject ?? meta.subject

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
      charCount: personalized.length,
      whatsappReady: Boolean(contact.phone),
    }
  })

  const whatsappReadyCount = messages.filter((m) => m.whatsappReady).length

  const campaign: MarketingCampaign = {
    id: randomUUID(),
    agencyId: params.agencyId,
    goal: params.goal,
    tone: params.tone,
    maidReferences: params.maidReferences,
    audienceType: params.audienceType,
    messageTemplate: template,
    subject,
    messages,
    contactCount: contacts.length,
    whatsappReadyCount,
    emailOnlyCount: contacts.length - whatsappReadyCount,
    generatedAt: new Date().toISOString(),
    aiUsed,
  }

  saveCampaignToMemory(campaign)
  return campaign
}
