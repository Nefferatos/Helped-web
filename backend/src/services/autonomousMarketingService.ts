import { randomUUID } from 'crypto'
import {
  buildAudience,
  generateMarketingCampaign,
  getCampaignsByAgency,
  type CampaignGoal,
  type CampaignTone,
  type AudienceType,
  type MarketingCampaign,
} from './directMarketingAiService'
import { getAllMaidsStore, getEnquiriesStore, getDirectSalesStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriggerType =
  | 'new_helpers'
  | 'stale_enquiries'
  | 'cold_leads'
  | 'upcoming_holiday'

export interface AdvertisingOpportunity {
  id: string
  triggerType: TriggerType
  title: string
  reasoning: string
  goal: CampaignGoal
  tone: CampaignTone
  audienceType: AudienceType
  maidReferences: string[]
  estimatedReach: number
  priority: 'high' | 'medium' | 'low'
  detectedAt: string
}

export interface AutonomousScanResult {
  scannedAt: string
  agencyId: number
  opportunities: AdvertisingOpportunity[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

const UPCOMING_HOLIDAYS = [
  { month: 1,  day: 1,  name: 'New Year' },
  { month: 2,  day: 14, name: "Valentine's Day" },
  { month: 8,  day: 9,  name: 'National Day' },
  { month: 10, day: 31, name: 'Halloween' },
  { month: 12, day: 25, name: 'Christmas' },
  { month: 12, day: 31, name: "New Year's Eve" },
]

const detectUpcomingHoliday = (): string | null => {
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * DAY_MS)
  for (const h of UPCOMING_HOLIDAYS) {
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const date = new Date(year, h.month - 1, h.day)
      if (date >= now && date <= horizon) return h.name
    }
  }
  return null
}

const recentGoals = (agencyId: number): Set<CampaignGoal> => {
  const cutoff = Date.now() - DAY_MS
  return new Set(
    getCampaignsByAgency(agencyId)
      .filter((c) => new Date(c.generatedAt).getTime() > cutoff)
      .map((c) => c.goal),
  )
}

// ─── Trigger detection ────────────────────────────────────────────────────────

export const scanForOpportunities = async (agencyId: number): Promise<AutonomousScanResult> => {
  const detectedAt = new Date().toISOString()
  const alreadyRan = recentGoals(agencyId)
  const opportunities: AdvertisingOpportunity[] = []

  // ── 1. New helpers added in last 24 h ──────────────────────────────────────
  if (!alreadyRan.has('new_arrivals')) {
    const maids = await getAllMaidsStore(undefined, 'public')
    const newMaids = maids
      .filter((m) => m.agencyId === agencyId)
      .filter((m) => {
        const ts = Date.parse(String(m.createdAt ?? ''))
        return Number.isFinite(ts) && Date.now() - ts < DAY_MS
      })

    if (newMaids.length > 0) {
      const audience = await buildAudience('all_contacts', agencyId)
      if (audience.length > 0) {
        opportunities.push({
          id: randomUUID(),
          triggerType: 'new_helpers',
          title: `${newMaids.length} new helper${newMaids.length > 1 ? 's' : ''} available`,
          reasoning: `${newMaids.length} maid profile${newMaids.length > 1 ? 's were' : ' was'} added in the last 24 hours. Notify all ${audience.length} contacts while interest is highest.`,
          goal: 'new_arrivals',
          tone: 'warm',
          audienceType: 'all_contacts',
          maidReferences: newMaids.slice(0, 3).map((m) => m.referenceCode),
          estimatedReach: audience.length,
          priority: 'high',
          detectedAt,
        })
      }
    }
  }

  // ── 2. Stale enquiries (no update in 3+ days) ──────────────────────────────
  if (!alreadyRan.has('follow_up')) {
    const enquiries = await getEnquiriesStore(undefined, agencyId)
    const stale = enquiries.filter((e) => {
      const ts = Date.parse(String(e.createdAt ?? ''))
      return Number.isFinite(ts) && Date.now() - ts > 3 * DAY_MS
    })

    if (stale.length > 0) {
      const audience = await buildAudience('enquiry_leads', agencyId)
      if (audience.length > 0) {
        opportunities.push({
          id: randomUUID(),
          triggerType: 'stale_enquiries',
          title: `${stale.length} enquir${stale.length > 1 ? 'ies' : 'y'} awaiting follow-up`,
          reasoning: `${stale.length} enquir${stale.length > 1 ? 'ies have' : 'y has'} had no update in 3+ days. A warm follow-up to ${audience.length} leads could reactivate interest.`,
          goal: 'follow_up',
          tone: 'warm',
          audienceType: 'enquiry_leads',
          maidReferences: [],
          estimatedReach: audience.length,
          priority: 'high',
          detectedAt,
        })
      }
    }
  }

  // ── 3. Cold direct-sale leads (7+ days inactive) ───────────────────────────
  if (!alreadyRan.has('re_engage')) {
    const directSales = await getDirectSalesStore(agencyId)
    const cold = directSales.filter((ds) => {
      const ts = Date.parse(String(ds.updatedAt ?? ds.createdAt ?? ''))
      return Number.isFinite(ts) && Date.now() - ts > 7 * DAY_MS
    })

    if (cold.length > 0) {
      const audience = await buildAudience('direct_sale_leads', agencyId)
      if (audience.length > 0) {
        opportunities.push({
          id: randomUUID(),
          triggerType: 'cold_leads',
          title: `${cold.length} cold lead${cold.length > 1 ? 's' : ''} to re-engage`,
          reasoning: `${cold.length} direct-sale lead${cold.length > 1 ? 's have' : ' has'} been inactive for 7+ days. A casual re-engagement message to ${audience.length} contacts could revive the pipeline.`,
          goal: 're_engage',
          tone: 'casual',
          audienceType: 'direct_sale_leads',
          maidReferences: [],
          estimatedReach: audience.length,
          priority: 'medium',
          detectedAt,
        })
      }
    }
  }

  // ── 4. Upcoming holiday (within 7 days) ────────────────────────────────────
  if (!alreadyRan.has('holiday')) {
    const holidayName = detectUpcomingHoliday()
    if (holidayName) {
      const audience = await buildAudience('all_contacts', agencyId)
      if (audience.length > 0) {
        opportunities.push({
          id: randomUUID(),
          triggerType: 'upcoming_holiday',
          title: `${holidayName} is coming — send greetings`,
          reasoning: `${holidayName} is within the next 7 days. A festive greeting to all ${audience.length} contacts builds goodwill and keeps the agency top of mind.`,
          goal: 'holiday',
          tone: 'warm',
          audienceType: 'all_contacts',
          maidReferences: [],
          estimatedReach: audience.length,
          priority: 'medium',
          detectedAt,
        })
      }
    }
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return { scannedAt: detectedAt, agencyId, opportunities }
}

// ─── Execute a single opportunity → returns a generated campaign ──────────────

export const executeOpportunity = async (
  agencyId: number,
  opportunity: AdvertisingOpportunity,
): Promise<MarketingCampaign> => {
  return generateMarketingCampaign({
    agencyId,
    goal: opportunity.goal,
    tone: opportunity.tone,
    maidReferences: opportunity.maidReferences,
    audienceType: opportunity.audienceType,
  })
}

// ─── Scan + execute all opportunities in one call ────────────────────────────

export const runAutonomousCampaigns = async (
  agencyId: number,
): Promise<{ scannedAt: string; generated: MarketingCampaign[]; skippedCount: number }> => {
  const { scannedAt, opportunities } = await scanForOpportunities(agencyId)

  const generated: MarketingCampaign[] = []
  for (const opp of opportunities) {
    try {
      const campaign = await executeOpportunity(agencyId, opp)
      generated.push(campaign)
    } catch {
      // continue with remaining opportunities
    }
  }

  return { scannedAt, generated, skippedCount: opportunities.length - generated.length }
}
