import {
  LeadClassification,
  LeadSource,
  NotificationChannel,
} from '../types/workflow'

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export const requiredString = (
  value: unknown,
  field: string,
  maxLength = 2000
) => {
  const result = cleanString(value)
  if (!result) {
    throw new Error(`${field} is required`)
  }
  return result.slice(0, maxLength)
}

export const optionalString = (value: unknown, maxLength = 2000) =>
  cleanString(value).slice(0, maxLength)

export const positiveInteger = (value: unknown, field: string) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`)
  }
  return parsed
}

export const parseLeadSource = (value: unknown): LeadSource => {
  const normalized = cleanString(value).toLowerCase()
  if (
    normalized === 'facebook' ||
    normalized === 'website' ||
    normalized === 'scraped'
  ) {
    return normalized
  }
  throw new Error('source must be one of facebook, website, or scraped')
}

export const parseLeadClassification = (
  value: unknown
): LeadClassification => {
  const normalized = cleanString(value).toUpperCase()
  if (
    normalized === 'HIGH' ||
    normalized === 'MEDIUM' ||
    normalized === 'LOW'
  ) {
    return normalized
  }
  throw new Error('classification must be HIGH, MEDIUM, or LOW')
}

export const parseNotificationChannel = (
  value: unknown
): NotificationChannel => {
  const normalized = cleanString(value).toLowerCase()
  if (
    normalized === 'email' ||
    normalized === 'sms' ||
    normalized === 'whatsapp' ||
    normalized === 'internal'
  ) {
    return normalized
  }
  throw new Error('channel must be email, sms, whatsapp, or internal')
}

export const sanitizePayload = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}
