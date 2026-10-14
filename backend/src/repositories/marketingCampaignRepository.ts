import { query, sql } from '../db'
import type { MarketingCampaign } from '../services/directMarketingAiService'

export const saveMarketingCampaign = async (campaign: MarketingCampaign): Promise<void> => {
  await query(sql`
    INSERT INTO marketing_campaigns (id, agency_id, campaign, created_at)
    VALUES (${campaign.id}::uuid, ${campaign.agencyId}, ${JSON.stringify(campaign)}::jsonb, ${campaign.generatedAt}::timestamptz)
    ON CONFLICT (id) DO UPDATE SET campaign = EXCLUDED.campaign
  `)
  // Keep only the newest 20 campaigns for the agency. NOTE: this must use
  // LIMIT 20 — a plain OFFSET 20 returns no rows when the agency has <= 20
  // campaigns, which made `id NOT IN (...)` match every row and delete the
  // campaign that was just inserted (history/summary were always empty).
  await query(sql`
    DELETE FROM marketing_campaigns
    WHERE agency_id = ${campaign.agencyId}
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM marketing_campaigns
          WHERE agency_id = ${campaign.agencyId}
          ORDER BY created_at DESC
          LIMIT 20
        ) AS keep
      )
  `)
}

export const getMarketingCampaigns = async (agencyId: number): Promise<MarketingCampaign[]> => {
  const result = await query(sql`
    SELECT campaign FROM marketing_campaigns
    WHERE agency_id = ${agencyId}
    ORDER BY created_at DESC
    LIMIT 20
  `)
  return result.rows.map((row: { campaign: MarketingCampaign | string }) =>
    typeof row.campaign === 'string' ? JSON.parse(row.campaign) as MarketingCampaign : row.campaign,
  )
}

export const getMarketingCampaign = async (agencyId: number, id: string): Promise<MarketingCampaign | null> => {
  const result = await query(sql`
    SELECT campaign FROM marketing_campaigns
    WHERE agency_id = ${agencyId} AND id = ${id}::uuid
    LIMIT 1
  `)
  const value = result.rows[0]?.campaign as MarketingCampaign | string | undefined
  if (!value) return null
  return typeof value === 'string' ? JSON.parse(value) as MarketingCampaign : value
}
