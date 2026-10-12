import { Request, Response } from 'express'
import { getRequestAgencyId } from '../auth'
import {
  buildAudience,
  generateMarketingCampaign,
  type AudienceType,
  type CampaignGoal,
  type CampaignTone,
} from '../services/directMarketingAiService'
import { getMarketingCampaign, getMarketingCampaigns } from '../repositories/marketingCampaignRepository'
import { filterContactsWithMarketingConsent, hasActiveConsent, recordConsent, withdrawConsent } from '../services/consentService'
import {
  executeOpportunity,
  runAutonomousCampaigns,
  scanForOpportunities,
  type AdvertisingOpportunity,
} from '../services/autonomousMarketingService'

const VALID_GOALS = new Set<CampaignGoal>([
  'new_arrivals', 're_engage', 'promotion', 'holiday', 'follow_up', 'custom',
])

const VALID_TONES = new Set<CampaignTone>([
  'professional', 'warm', 'urgent', 'casual',
])

const VALID_AUDIENCE = new Set<AudienceType>([
  'all_clients', 'enquiry_leads', 'direct_sale_leads', 'all_contacts',
])

export const getAudienceOptions = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const audienceType = (req.query.type as AudienceType | undefined) ?? 'all_contacts'

    if (!VALID_AUDIENCE.has(audienceType)) {
      return res.status(400).json({ error: 'Invalid audience type' })
    }

    const audience = await buildAudience(audienceType, agencyId)
    const eligible = await filterContactsWithMarketingConsent(agencyId, audience)
    const contacts = req.query.manage === 'true'
      ? await Promise.all(audience.map(async (contact) => ({
          ...contact,
          whatsappConsent: await hasActiveConsent(agencyId, contact.phone, 'whatsapp'),
          emailConsent: await hasActiveConsent(agencyId, contact.email, 'email'),
        })))
      : eligible
    res.status(200).json({ contacts, total: audience.length, eligibleTotal: eligible.length })
  } catch (error) {
    console.error('[directMarketing] getAudienceOptions error:', error)
    res.status(500).json({ error: 'Failed to load audience' })
  }
}

export const updateAudienceConsent = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const audienceType = req.body.audienceType as AudienceType
    const contactId = typeof req.body.contactId === 'string' ? req.body.contactId.trim() : ''
    const channel = req.body.channel === 'whatsapp' || req.body.channel === 'email' ? req.body.channel : null
    const consented = req.body.consented === true
    const source = typeof req.body.source === 'string' ? req.body.source.trim().slice(0, 250) : ''
    if (!VALID_AUDIENCE.has(audienceType) || !contactId || !channel) {
      return res.status(400).json({ error: 'Valid audienceType, contactId, and consent channel are required' })
    }
    if (consented && source.length < 5) {
      return res.status(400).json({ error: 'Enter where the explicit opt-in was recorded (at least 5 characters)' })
    }
    const contact = (await buildAudience(audienceType, agencyId)).find((item) => item.id === contactId)
    if (!contact) return res.status(404).json({ error: 'Audience contact not found' })
    const subject = channel === 'email' ? contact.email : contact.phone
    if (!subject) return res.status(400).json({ error: `This contact has no ${channel} address` })
    if (consented) await recordConsent({ agencyId, subject, channel, source })
    else {
      // Marketing-level consent is stored against a phone number, so only
      // clear it when the person opts out of WhatsApp. Email opt-outs stay
      // scoped to that email address.
      await withdrawConsent({ agencyId, subject, channel })
      if (channel === 'whatsapp') {
        await withdrawConsent({ agencyId, subject, channel: 'marketing' })
      }
    }
    return res.status(200).json({ ok: true, consented })
  } catch (error) {
    console.error('[directMarketing] updateAudienceConsent error:', error)
    return res.status(500).json({ error: 'Failed to update consent' })
  }
}

export const generateCampaign = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)

    const goal = req.body.goal as CampaignGoal
    const tone = (req.body.tone as CampaignTone) ?? 'warm'
    const maidReferences: string[] = Array.isArray(req.body.maidReferences)
      ? req.body.maidReferences.map((r: unknown) => String(r).trim()).filter(Boolean)
      : []
    const audienceType = (req.body.audienceType as AudienceType) ?? 'all_contacts'
    const customNote = typeof req.body.customNote === 'string' ? req.body.customNote.slice(0, 500) : ''
    const contactIds: string[] | undefined = Array.isArray(req.body.contactIds)
      ? Array.from(new Set<string>((req.body.contactIds as unknown[]).map((id) => String(id).trim()).filter((id) => id.length > 0)))
      : undefined

    if (!goal || !VALID_GOALS.has(goal)) {
      return res.status(400).json({ error: 'goal is required and must be one of: new_arrivals, re_engage, promotion, holiday, follow_up, custom' })
    }

    if (!VALID_TONES.has(tone)) {
      return res.status(400).json({ error: 'tone must be one of: professional, warm, urgent, casual' })
    }

    if (!VALID_AUDIENCE.has(audienceType)) {
      return res.status(400).json({ error: 'Invalid audienceType' })
    }

    const campaign = await generateMarketingCampaign({
      agencyId,
      goal,
      tone,
      maidReferences,
      audienceType,
      customNote,
      contactIds,
    })

    res.status(200).json({ campaign })
  } catch (error) {
    console.error('[directMarketing] generateCampaign error:', error)
    res.status(500).json({ error: 'Failed to generate campaign' })
  }
}

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const campaigns = (await getMarketingCampaigns(agencyId)).map((c) => ({
      id: c.id,
      goal: c.goal,
      tone: c.tone,
      audienceType: c.audienceType,
      contactCount: c.contactCount,
      generatedAt: c.generatedAt,
      aiUsed: c.aiUsed,
      maidReferences: c.maidReferences,
    }))
    res.status(200).json({ campaigns })
  } catch (error) {
    console.error('[directMarketing] getCampaigns error:', error)
    res.status(500).json({ error: 'Failed to load campaigns' })
  }
}

export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const { id } = req.params
    const campaign = await getMarketingCampaign(agencyId, id)
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }
    res.status(200).json({ campaign })
  } catch (error) {
    console.error('[directMarketing] getCampaignById error:', error)
    res.status(500).json({ error: 'Failed to load campaign' })
  }
}

// ─── Autonomous agent endpoints ───────────────────────────────────────────────

export const autonomousScan = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const result = await scanForOpportunities(agencyId)
    res.status(200).json(result)
  } catch (error) {
    console.error('[directMarketing] autonomousScan error:', error)
    res.status(500).json({ error: 'Scan failed' })
  }
}

export const autonomousRun = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)

    // If an explicit opportunity is passed, execute just that one
    if (req.body.opportunity) {
      const opp = req.body.opportunity as AdvertisingOpportunity
      const campaign = await executeOpportunity(agencyId, opp)
      return res.status(200).json({ campaigns: [campaign], skippedCount: 0 })
    }

    // Otherwise run all detected opportunities
    const result = await runAutonomousCampaigns(agencyId)
    res.status(200).json({
      scannedAt: result.scannedAt,
      campaigns: result.generated,
      skippedCount: result.skippedCount,
    })
  } catch (error) {
    console.error('[directMarketing] autonomousRun error:', error)
    res.status(500).json({ error: 'Autonomous run failed' })
  }
}
