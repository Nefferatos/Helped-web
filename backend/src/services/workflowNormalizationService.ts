import { BudgetRange } from '../types/workflow'

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, ' ').trim()

export const normalizeServiceType = (value: string) => {
  const text = normalizeWhitespace(value).toLowerCase()
  if (!text) return 'general_housekeeping'
  if (/(infant|baby|newborn|child|kids?)/.test(text)) return 'childcare'
  if (/(elderly|senior|bedridden|disabled)/.test(text)) return 'eldercare'
  if (/(cook|cooking|kitchen)/.test(text)) return 'cooking'
  if (/(clean|housekeeping|housework)/.test(text)) return 'general_housekeeping'
  return text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'general_housekeeping'
}

export const normalizeUrgency = (value: string) => {
  const text = normalizeWhitespace(value).toLowerCase()
  if (!text) return 'normal'
  if (/(urgent|asap|immediately|today|right away)/.test(text)) return 'high'
  if (/(soon|this week|next week|quickly)/.test(text)) return 'medium'
  return 'normal'
}

export const normalizeLocation = (value: string) => {
  const text = normalizeWhitespace(value.replace(/[^\w\s,-]/g, ' '))
  if (!text) return 'Singapore'
  return titleCase(text)
}

const parseMoneyNumber = (value: string) =>
  Number(value.replace(/[^0-9.]/g, '').replace(/^$/, 'NaN'))

export const normalizeBudget = (value: string): BudgetRange => {
  const text = normalizeWhitespace(value)
  const matches = text.match(/\d[\d,]*/g) ?? []

  if (matches.length >= 2) {
    const min = parseMoneyNumber(matches[0] ?? '')
    const max = parseMoneyNumber(matches[1] ?? '')
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
      currency: /usd/i.test(text) ? 'USD' : 'SGD',
      text,
    }
  }

  if (matches.length === 1) {
    const exact = parseMoneyNumber(matches[0] ?? '')
    return {
      min: Number.isFinite(exact) ? exact : null,
      max: Number.isFinite(exact) ? exact : null,
      currency: /usd/i.test(text) ? 'USD' : 'SGD',
      text,
    }
  }

  return {
    min: null,
    max: null,
    currency: 'SGD',
    text,
  }
}

export const extractBudgetFromText = (message: string) => {
  const match =
    message.match(
      /(?:budget|salary|pay|offer)[^0-9]{0,10}((?:s?\$|sgd|usd)?\s*\d[\d,]*(?:\s*(?:-|to)\s*(?:s?\$|sgd|usd)?\s*\d[\d,]*)?)/i
    ) ??
    message.match(/((?:s?\$|sgd|usd)\s*\d[\d,]*(?:\s*(?:-|to)\s*(?:s?\$|sgd|usd)?\s*\d[\d,]*)?)/i)

  return normalizeBudget(match?.[1] ?? '')
}

export const extractLocationFromText = (message: string) => {
  const match = message.match(
    /(?:location|area|in|at|around|near)\s+([a-zA-Z][a-zA-Z\s,-]{2,40})/i
  )
  return normalizeLocation(match?.[1] ?? '')
}
