import { query, sql } from '../db'

export type ConsentChannel = 'marketing' | 'whatsapp' | 'sms' | 'email'

export interface ConsentInput {
  agencyId: number
  subject: string
  channel: ConsentChannel
  source: string
  consentedAt?: Date
}

const normalizeSubject = (subject: string, channel: ConsentChannel): string => {
  const value = subject.trim()
  return channel === 'email' ? value.toLowerCase() : value.replace(/\D/g, '')
}

/**
 * Stores an explicit, auditable opt-in. Marketing delivery is deliberately
 * fail-closed: the absence of a matching active consent is not permission.
 */
export const recordConsent = async (input: ConsentInput): Promise<void> => {
  const subject = normalizeSubject(input.subject, input.channel)
  if (!subject) throw new Error('A valid consent subject is required')

  await query(sql`
    INSERT INTO consents (agency_id, subject, channel, source, consented_at, unsubscribed_at)
    VALUES (${input.agencyId}, ${subject}, ${input.channel}, ${input.source.trim() || 'manual'}, ${input.consentedAt ?? new Date()}, NULL)
    ON CONFLICT (agency_id, subject, channel)
    DO UPDATE SET source = EXCLUDED.source, consented_at = EXCLUDED.consented_at, unsubscribed_at = NULL
  `)
}

export const withdrawConsent = async (input: Omit<ConsentInput, 'source' | 'consentedAt'>): Promise<void> => {
  const subject = normalizeSubject(input.subject, input.channel)
  if (!subject) throw new Error('A valid consent subject is required')

  await query(sql`
    UPDATE consents
    SET unsubscribed_at = NOW()
    WHERE agency_id = ${input.agencyId} AND subject = ${subject} AND channel = ${input.channel}
  `)
}

export const hasActiveConsent = async (
  agencyId: number,
  subjectValue: string,
  channel: ConsentChannel
): Promise<boolean> => {
  const subject = normalizeSubject(subjectValue, channel)
  if (!subject) return false

  const result = await query(sql`
    SELECT EXISTS(
      SELECT 1 FROM consents
      WHERE agency_id = ${agencyId}
        AND subject = ${subject}
        AND channel IN (${channel}, 'marketing')
        AND consented_at IS NOT NULL
        AND unsubscribed_at IS NULL
    ) AS allowed
  `)
  return result.rows[0]?.allowed === true
}

export const filterContactsWithMarketingConsent = async <T extends { phone: string; email: string }>(
  agencyId: number,
  contacts: T[]
): Promise<T[]> => {
  const decisions = await Promise.all(contacts.map(async (contact) => {
    const [whatsapp, email] = await Promise.all([
      hasActiveConsent(agencyId, contact.phone, 'whatsapp'),
      hasActiveConsent(agencyId, contact.email, 'email'),
    ])
    return whatsapp || email
  }))

  return contacts.filter((_, index) => decisions[index])
}
