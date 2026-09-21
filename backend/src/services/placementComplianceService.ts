export type PlacementType = 'EA_MATCHED' | 'ADMIN_ONLY' | 'TRANSFER' | 'DIRECT_SOURCE'

export type PlacementComplianceRule = {
  placementType: PlacementType
  agencyFeeAllowed: boolean
  refundGuaranteeDays: number
  requiresWorkPermit: boolean
  requiresEmployerInterview: boolean
}

const rules: Record<PlacementType, PlacementComplianceRule> = {
  EA_MATCHED: { placementType: 'EA_MATCHED', agencyFeeAllowed: true, refundGuaranteeDays: 180, requiresWorkPermit: true, requiresEmployerInterview: true },
  ADMIN_ONLY: { placementType: 'ADMIN_ONLY', agencyFeeAllowed: false, refundGuaranteeDays: 0, requiresWorkPermit: true, requiresEmployerInterview: false },
  TRANSFER: { placementType: 'TRANSFER', agencyFeeAllowed: true, refundGuaranteeDays: 90, requiresWorkPermit: true, requiresEmployerInterview: true },
  DIRECT_SOURCE: { placementType: 'DIRECT_SOURCE', agencyFeeAllowed: false, refundGuaranteeDays: 0, requiresWorkPermit: true, requiresEmployerInterview: true },
}

export const getPlacementComplianceRule = (placementType: PlacementType) => rules[placementType]
export const isPlacementType = (value: string): value is PlacementType => value in rules
