import { randomUUID } from 'crypto'
import {
  getAllMaidsStore,
  getClientsStore,
  getCompanyBundle,
  getDirectSalesStore,
  getEnquiriesStore,
  type MaidRecord,
} from '../store'
import { callMakeAiEngine } from './makeAiEngine'
import { hasActiveConsent } from './consentService'
import { saveMarketingCampaign } from '../repositories/marketingCampaignRepository'

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

export interface MarketingMaidRef {
  referenceCode: string
  fullName: string
  nationality: string
  type: string
  status: string
  skill: string
  hasPhoto: boolean
  profileUrl: string
  photoUrl: string
}

export interface MarketingMessage {
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactSource: string
  message: string
  /** Email HTML body (maid cards with photos + profile links). */
  html: string
  whatsappLink: string
  emailLink: string
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
  /** Public helpers referenced in the message, with profile + photo links. */
  maidList: MarketingMaidRef[]
}

// ─── In-memory campaign store (last 20 per agency) ────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildWhatsAppLink = (phone: string, message: string): string => {
  if (!phone?.trim()) return ''
  const hasPlus = phone.trimStart().startsWith('+')
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (!hasPlus && digits.length === 9 && digits.startsWith('0')) digits = digits.slice(1)
  if (!hasPlus && digits.length === 8) digits = `65${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

// ─── Public maid list (embedded in marketing messages) ────────────────────────

const MARKETING_FEATURED_MAID_LIMIT = 3

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Absolute base URL used for maid profile / photo links inside emails and
 * WhatsApp text. Configure PUBLIC_SITE_URL (or SITE_URL / APP_BASE_URL).
 */
const publicBaseUrl = (): string => {
  const configured =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    ''
  return (configured || 'https://findmaid.wow-aisolution.workers.dev').replace(/\/+$/, '')
}

const maidPrimarySkill = (maid: MaidRecord): string =>
  Object.entries(maid.workAreas ?? {})
    .filter(([, v]) => (v as Record<string, unknown>)?.experience)
    .map(([area]) => area)
    .slice(0, 2)
    .join(' & ')

const toMarketingMaidRef = (
  maid: MaidRecord,
  agencyId: number,
  baseUrl: string,
): MarketingMaidRef => {
  const hasPhoto = Boolean(
    (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls[0]) || maid.photoDataUrl,
  )
  const ref = encodeURIComponent(maid.referenceCode)
  return {
    referenceCode: maid.referenceCode,
    fullName: maid.fullName,
    nationality: maid.nationality ?? '',
    type: maid.type ?? '',
    status: maid.status ?? 'available',
    skill: maidPrimarySkill(maid),
    hasPhoto,
    profileUrl: `${baseUrl}/maids/${ref}`,
    photoUrl: hasPhoto ? `${baseUrl}/api/maids/${ref}/photo-preview?agencyId=${agencyId}` : '',
  }
}

const buildMaidListText = (maids: MarketingMaidRef[]): string => {
  if (maids.length === 0) return ''
  const lines = maids.map((maid, index) => {
    const detail = [maid.nationality, maid.skill].filter(Boolean).join(' · ')
    return `${index + 1}. ${maid.fullName}${detail ? ` — ${detail}` : ''}\n   ${maid.profileUrl}`
  })
  return `\n\nHelpers we recommend:\n\n${lines.join('\n\n')}`
}

const buildMarketingEmailHtml = (params: {
  bodyText: string
  maids: MarketingMaidRef[]
  agencyName: string
  agencyPhone: string
}): string => {
  const cards = params.maids
    .map((maid) => {
      const meta = [maid.nationality, maid.type].filter(Boolean).join(' · ')
      const photo = maid.photoUrl
        ? `<img src="${escapeHtml(maid.photoUrl)}" width="88" height="88" alt="${escapeHtml(maid.fullName)}" style="border-radius:10px;object-fit:cover;display:block" />`
        : ''
      return `
        <tr>
          <td style="vertical-align:top;padding:12px 12px 12px 0;width:100px">${photo}</td>
          <td style="vertical-align:top;padding:12px 0">
            <a href="${escapeHtml(maid.profileUrl)}" style="font-weight:700;color:#0f766e;text-decoration:none;font-size:15px">${escapeHtml(maid.fullName)}</a>
            ${meta ? `<div style="color:#475569;font-size:13px;margin-top:2px">${escapeHtml(meta)}</div>` : ''}
            ${maid.skill ? `<div style="color:#065f46;font-size:13px;margin-top:2px">Skills: ${escapeHtml(maid.skill)}</div>` : ''}
            <a href="${escapeHtml(maid.profileUrl)}" style="color:#0369a1;font-size:13px;text-decoration:none">View full profile →</a>
          </td>
        </tr>`
    })
    .join('')

  const footer = [params.agencyName, params.agencyPhone].filter(Boolean).join(' · ')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9">
    <div style="max-width:560px;margin:0 auto;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111827">
      <div style="white-space:pre-wrap">${escapeHtml(params.bodyText)}</div>
      ${
        params.maids.length > 0
          ? `<h3 style="margin:22px 0 4px;font-size:15px;color:#0f766e">Helpers we recommend</h3>
             <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${cards}</table>`
          : ''
      }
      <p style="margin:24px 0 0;color:#6b7280;font-size:12px">${escapeHtml(footer)}</p>
    </div>
  </body>
</html>`
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
    intent: 'share a promotion that the agency has explicitly described; if no approved promotion details are provided, invite the recipient to ask about current offers without implying a discount or limited availability',
    hook: 'Ask us about our current placement options.',
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
- Never invent discounts, limited slots, availability, credentials, or other claims not present in the supplied facts
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
    if (
      typeof parsed.template === 'string'
      && parsed.template.includes('{{name}}')
      && parsed.template.includes('{{agencyPhone}}')
      && parsed.template.length <= 800
    ) {
      const subject = String(parsed.subject ?? 'Helper Update').trim().slice(0, 120) || 'Helper Update'
      return { template: parsed.template, subject }
    }
    return null
  } catch {
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
      : `${emoji}We would be happy to share current helper profiles and availability. Let us know what your family needs.`,
    re_engage: `${emoji}We noticed you enquired with us before. If you are still looking for a helper, we would be happy to assist.`,
    promotion: `${emoji}Ask us about our current placement options and approved offers. ${maidHighlight ? `${maidHighlight} may be a match for your needs.` : 'We would be happy to discuss your needs.'}`,
    holiday: `${emoji}Warmest greetings from ${agencyName}! If you need help with a placement, please contact us to discuss current options.`,
    follow_up: `${emoji}Just following up on your earlier enquiry. ${maidHighlight ? `${maidHighlight} may be a match for your needs.` : 'Please let us know if you still need assistance.'}`,
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
    includeEnquiries || includeClients ? getEnquiriesStore(undefined, agencyId) : Promise.resolve([]),
    includeDirectSales || includeClients ? getDirectSalesStore(agencyId) : Promise.resolve([]),
  ])

  // Client accounts are shared across the site. Only expose accounts already
  // linked to this agency through its enquiries or direct-sale records.
  const agencyClientIds = new Set<number>([
    ...enquiries.map((enquiry) => enquiry.clientId).filter((id): id is number => Number.isInteger(id)),
    ...directSales.map((sale) => sale.clientId).filter((id): id is number => Number.isInteger(id)),
  ])

  for (const c of clients.filter((client) => agencyClientIds.has(client.id))) {
    contacts.push({
      id: `client-${c.id}`,
      name: c.name?.trim() || c.email,
      phone: c.phone?.trim() || '',
      email: c.email?.trim() || '',
      source: 'client',
    })
  }

  for (const e of includeEnquiries ? enquiries : []) {
    contacts.push({
      id: `enquiry-${e.id}`,
      name: e.clientName?.trim() || e.username?.trim() || e.email,
      phone: e.phone?.trim() || '',
      email: e.email?.trim() || '',
      source: 'enquiry',
    })
  }

  const seenDirectIds = new Set<number>()
  const latestDirectSales = [...directSales].sort((a, b) =>
    Date.parse(String(b.updatedAt ?? b.createdAt)) - Date.parse(String(a.updatedAt ?? a.createdAt)),
  )
  for (const ds of includeDirectSales ? latestDirectSales : []) {
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
  contactIds?: string[]
}): Promise<MarketingCampaign> => {
  const [allMaids, companyBundle, audience] = await Promise.all([
    getAllMaidsStore(undefined, 'public'),
    getCompanyBundle().catch(() => null),
    buildAudience(params.audienceType, params.agencyId),
  ])
  // This is the final gate before a WhatsApp deeplink or email recipient is
  // returned to the UI. No explicit opt-in means no marketing delivery.
  const scopedAudience = params.contactIds !== undefined
    ? audience.filter((contact) => params.contactIds!.includes(contact.id))
    : audience
  const contacts = (await Promise.all(scopedAudience.map(async (contact) => ({
    contact,
    whatsappAllowed: await hasActiveConsent(params.agencyId, contact.phone, 'whatsapp'),
    emailAllowed: await hasActiveConsent(params.agencyId, contact.email, 'email'),
  })))).filter(({ whatsappAllowed, emailAllowed }) => whatsappAllowed || emailAllowed)

  const companyProfile = companyBundle?.companyProfile ?? null
  const agencyName = companyProfile?.company_name || companyProfile?.short_name || 'Our Agency'
  const agencyPhone =
    companyProfile?.social_whatsapp_number?.trim() ||
    companyProfile?.contact_phone?.trim() ||
    ''

  const selectedMaids = allMaids.filter((m) =>
    m.agencyId === params.agencyId && m.isPublic && params.maidReferences.includes(m.referenceCode),
  )
  // Feature the chosen helpers, or fall back to the first few public helpers so
  // every message can carry a real maid list (names + links, plus photos in email).
  const featuredMaids = selectedMaids.length > 0
    ? selectedMaids
    : allMaids
        .filter((m) => m.agencyId === params.agencyId && m.isPublic)
        .slice(0, MARKETING_FEATURED_MAID_LIMIT)

  const baseUrl = publicBaseUrl()
  const maidList = featuredMaids.map((maid) => toMarketingMaidRef(maid, params.agencyId, baseUrl))
  const maidListText = buildMaidListText(maidList)

  const meta = goalMeta(params.goal)

  const userPrompt = [
    `Campaign goal: ${meta.intent}`,
    `Tone: ${toneGuide(params.tone)}`,
    `Agency name: ${agencyName}`,
    `Agency WhatsApp / phone: ${agencyPhone || 'our agency number'}`,
    '',
    'Featured domestic helpers (include 1-2 names and 1 skill each in the message):',
    featuredMaids.length > 0
      ? featuredMaids.map(describeMaid).join('\n\n')
      : '(No specific helpers provided — write a compelling general availability message)',
    '',
    params.customNote?.trim()
      ? `Special instruction from agency: ${params.customNote.trim()}`
      : '',
  ].filter((l) => l !== undefined).join('\n')

  // Make.com is the ONLY AI engine for marketing copy. When the webhook is not
  // configured or fails, we fall back to the deterministic local template
  // (buildFallbackTemplate) instead of calling Claude/Groq directly.
  let aiResult: { template: string; subject: string } | null = null

  const makeResult = await callMakeAiEngine({
    scenario: 'marketing',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  }).catch(() => null)

  if (makeResult?.json && typeof makeResult.json.template === 'string') {
    aiResult = parseAiJson(JSON.stringify(makeResult.json))
  } else if (makeResult?.text) {
    aiResult = parseAiJson(makeResult.text)
  }

  const aiUsed = Boolean(aiResult)

  const template = aiResult?.template
    ?? buildFallbackTemplate(params.goal, params.tone, featuredMaids, agencyName, agencyPhone)
  const subject = aiResult?.subject ?? meta.subject

  const messages: MarketingMessage[] = contacts.map(({ contact, whatsappAllowed, emailAllowed }) => {
    const body = template
      .replace(/\{\{name\}\}/g, contact.name || 'there')
      .replace(/\{\{agencyPhone\}\}/g, agencyPhone || agencyName)
    // WhatsApp text and the copyable body include the maid list as text+links;
    // the HTML body (used by the "Send email" button) renders maid cards with
    // photos and profile links.
    const message = `${body}${maidListText}`

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: whatsappAllowed ? contact.phone : '',
      contactEmail: emailAllowed ? contact.email : '',
      contactSource: contact.source,
      message,
      html: buildMarketingEmailHtml({ bodyText: body, maids: maidList, agencyName, agencyPhone }),
      whatsappLink: whatsappAllowed ? buildWhatsAppLink(contact.phone, message) : '',
      emailLink: emailAllowed && contact.email
        ? `mailto:${encodeURIComponent(contact.email).replace(/%40/gi, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
        : '',
      charCount: message.length,
      whatsappReady: whatsappAllowed,
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
    maidList,
  }

  await saveMarketingCampaign(campaign)
  return campaign
}
