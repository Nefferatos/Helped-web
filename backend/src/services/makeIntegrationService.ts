import { addAutomationMessageStore, addLeadStore, getMaidsStore, MaidRecord } from '../store'

interface SendToMakePayload {
  message: string
  userId: string
}

interface SendMessagePayload {
  message: string
  userId: string
}

interface CreateLeadPayload {
  service: string
  budget: number
  location: string
  urgency: string
}

const DEFAULT_FALLBACK_MESSAGE = "Thanks! We're reviewing your request now."

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const normalizeBudget = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const sanitized = value.trim().toLowerCase()
  if (!sanitized) return null

  const match = sanitized.match(/(\d[\d,]*(?:\.\d+)?)\s*(k)?/)
  if (!match) return null

  const base = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(base)) return null

  return match[2] ? base * 1000 : base
}

const parseSalary = (maid: MaidRecord) => {
  const salarySource = maid.skillsPreferences as {
    salary?: unknown
    expectedSalary?: unknown
    maxSalary?: unknown
  }

  const salaryCandidate = salarySource.salary ?? salarySource.expectedSalary ?? salarySource.maxSalary
  return normalizeBudget(salaryCandidate)
}

export const forwardToMakeWebhook = async (payload: SendToMakePayload) => {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL?.trim()

  if (!webhookUrl) {
    return {
      ok: false,
      status: 503,
      data: null,
      error: 'MAKE_WEBHOOK_URL_NOT_CONFIGURED',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const body = await response.text()
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: body.slice(0, 500) || `Webhook returned status ${response.status}`,
      }
    }

    return {
      ok: true,
      status: response.status,
      data: body,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      status: 504,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown webhook error',
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const saveOutboundMessage = async (payload: SendMessagePayload) => {
  const saved = await addAutomationMessageStore(payload)
  console.log(`Outbound automation message saved for user ${payload.userId}`)
  return saved
}

export const getFilteredMaids = async (filters: { location?: string; maxSalary?: number }) => {
  const maids = await getMaidsStore()
  const normalizedLocation = typeof filters.location === 'string' ? normalizeText(filters.location) : ''

  return maids.filter((maid) => {
    const isAvailable = normalizeText(maid.status ?? 'available') === 'available'
    const locationMatches = normalizedLocation
      ? normalizeText(maid.homeAddress).includes(normalizedLocation)
      : true

    const salary = parseSalary(maid)
    const salaryMatches = typeof filters.maxSalary === 'number'
      ? salary !== null && salary <= filters.maxSalary
      : true

    return isAvailable && locationMatches && salaryMatches
  })
}

export const saveLead = async (payload: CreateLeadPayload) => addLeadStore(payload)

export const fallbackOutboundMessage = async (userId: string) =>
  saveOutboundMessage({ userId, message: DEFAULT_FALLBACK_MESSAGE })
