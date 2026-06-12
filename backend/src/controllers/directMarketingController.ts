import { Request, Response } from 'express'
import { getRequestAgencyId } from '../auth'
import {
  buildAudience,
  generateMarketingCampaign,
  getCampaignsByAgency,
  type AudienceType,
  type CampaignGoal,
  type CampaignTone,
} from '../services/directMarketingAiService'
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

    const contacts = await buildAudience(audienceType, agencyId)
    res.status(200).json({ contacts, total: contacts.length })
  } catch (error) {
    console.error('[directMarketing] getAudienceOptions error:', error)
    res.status(500).json({ error: 'Failed to load audience' })
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
    const campaigns = getCampaignsByAgency(agencyId).map((c) => ({
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
    const campaign = getCampaignsByAgency(agencyId).find((c) => c.id === id)
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
