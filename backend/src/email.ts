import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MailConfigurationError'
  }
}

export class MailDeliveryError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'MailDeliveryError'
    this.code = code
  }
}

type TellFriendEmailInput = {
  toName?: string
  toEmail: string
  fromName?: string
  fromEmail: string
  subject: string
  message: string
  maidRefCode?: string
}

let transporterPromise: Promise<nodemailer.Transporter> | null = null

const DEFAULT_SMTP_PORT = 587
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000
const DEFAULT_GREETING_TIMEOUT_MS = 10_000
const DEFAULT_SOCKET_TIMEOUT_MS = 20_000
const DEFAULT_MAX_MESSAGE_BYTES = 50_000
const DEFAULT_SUBJECT_LENGTH = 200
const DEFAULT_NAME_LENGTH = 100
const DEFAULT_REF_CODE_LENGTH = 50
const DEFAULT_TLS_MIN_VERSION: SMTPTransport.Options['tls'] extends
  | infer T
  | undefined
  ? T extends { minVersion?: infer V }
    ? V
    : never
  : never = 'TLSv1.2'

const getRequiredEnv = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new MailConfigurationError(`Missing ${key} mail configuration`)
  }
  return value
}

const getOptionalEnv = (key: string) => process.env[key]?.trim() || ''

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const parseIntegerEnv = (key: string, fallback: number) => {
  const raw = process.env[key]?.trim()
  if (!raw) {
    return fallback
  }

  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new MailConfigurationError(`${key} must be a positive integer`)
  }

  return value
}

const parseBooleanEnv = (key: string, fallback: boolean) => {
  const raw = process.env[key]?.trim().toLowerCase()
  if (!raw) {
    return fallback
  }

  if (raw === 'true') return true
  if (raw === 'false') return false

  throw new MailConfigurationError(`${key} must be "true" or "false"`)
}

const normalizeHeaderValue = (value: string, maxLength: number) =>
  value.replace(/[\r\n"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)

const normalizeTextContent = (value: string, maxLength: number) =>
  value.replace(/\r\n/g, '\n').trim().slice(0, maxLength)

const formatAddress = (email: string, name?: string) => {
  const safeName = name ? normalizeHeaderValue(name, DEFAULT_NAME_LENGTH) : ''
  return safeName ? `"${safeName}" <${email}>` : email
}

const sendEmailViaResend = async ({
  toEmail,
  toName,
  fromEmail,
  fromName,
  subject,
  text,
}: {
  toEmail: string
  toName?: string
  fromEmail: string
  fromName?: string
  subject: string
  text: string
}) => {
  const apiKey = getOptionalEnv('RESEND_API_KEY')
  const from = getOptionalEnv('RESEND_FROM')

  if (!apiKey || !from) {
    throw new MailConfigurationError(
      'Missing email configuration. Configure SMTP or RESEND_API_KEY/RESEND_FROM.'
    )
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [formatAddress(toEmail, toName)],
      reply_to: formatAddress(fromEmail, fromName),
      subject,
      text,
    }),
    signal: AbortSignal.timeout(parseIntegerEnv('MAIL_SEND_TIMEOUT_MS', 8000)),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new MailDeliveryError(
      `Resend request failed${details ? `: ${details.slice(0, 200)}` : ''}`,
      'RESEND_FAILED'
    )
  }
}

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = getRequiredEnv('SMTP_HOST')
      const port = parseIntegerEnv('SMTP_PORT', DEFAULT_SMTP_PORT)

      const secure =
        parseBooleanEnv('SMTP_SECURE', false) ||
        port === 465

      const transportOptions = {
        host,
        port,
        secure,
        pool: parseBooleanEnv('SMTP_POOL', true),
        connectionTimeout: parseIntegerEnv(
          'SMTP_CONNECTION_TIMEOUT_MS',
          DEFAULT_CONNECTION_TIMEOUT_MS
        ),
        greetingTimeout: parseIntegerEnv(
          'SMTP_GREETING_TIMEOUT_MS',
          DEFAULT_GREETING_TIMEOUT_MS
        ),
        socketTimeout: parseIntegerEnv(
          'SMTP_SOCKET_TIMEOUT_MS',
          DEFAULT_SOCKET_TIMEOUT_MS
        ),
        requireTLS: parseBooleanEnv('SMTP_REQUIRE_TLS', secure),
        tls: {
          rejectUnauthorized: parseBooleanEnv(
            'SMTP_TLS_REJECT_UNAUTHORIZED',
            process.env.NODE_ENV === 'production'
          ),
          minVersion:
            (process.env.SMTP_TLS_MIN_VERSION?.trim() as typeof DEFAULT_TLS_MIN_VERSION) ||
            DEFAULT_TLS_MIN_VERSION,
        },
        auth: {
          user: getRequiredEnv('SMTP_USER'),
          pass: getRequiredEnv('SMTP_PASS'),
        },
      }

      const transporter = nodemailer.createTransport(
        transportOptions as SMTPTransport.Options
      )

      await transporter.verify()
      return transporter
    })().catch((error) => {
      transporterPromise = null
      throw error
    })
  }

  return transporterPromise
}

export const sendTellFriendEmail = async ({
  toName,
  toEmail,
  fromName,
  fromEmail,
  subject,
  message,
  maidRefCode,
}: TellFriendEmailInput) => {
  const normalizedSubject = normalizeHeaderValue(subject, DEFAULT_SUBJECT_LENGTH)
  const normalizedMessage = normalizeTextContent(
    message,
    parseIntegerEnv('MAIL_TELL_FRIEND_MAX_MESSAGE_BYTES', DEFAULT_MAX_MESSAGE_BYTES)
  )
  const normalizedMaidRefCode = maidRefCode
    ? normalizeHeaderValue(maidRefCode, DEFAULT_REF_CODE_LENGTH)
    : ''
  const senderLabel = normalizeHeaderValue(fromName?.trim() || fromEmail, DEFAULT_NAME_LENGTH)
  const safeMessage = escapeHtml(normalizedMessage).replace(/\n/g, '<br />')
  const mailProvider = getOptionalEnv('MAIL_PROVIDER').toLowerCase()

  if (mailProvider === 'resend' || (getOptionalEnv('RESEND_API_KEY') && getOptionalEnv('RESEND_FROM'))) {
    await sendEmailViaResend({
      toEmail,
      toName,
      fromEmail,
      fromName,
      subject: normalizedSubject,
      text: normalizedMessage,
    })
    return
  }

  const transporter = await getTransporter()
  const fromAddress = process.env.SMTP_FROM?.trim() || getRequiredEnv('SMTP_USER')

  const result = await transporter.sendMail({
    from: fromAddress,
    sender: formatAddress(fromEmail, fromName),
    to: formatAddress(toEmail, toName),
    replyTo: formatAddress(fromEmail, fromName),
    subject: normalizedSubject,
    text: normalizedMessage,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">
        <p>${escapeHtml(senderLabel)} shared a maid profile with you.</p>
        <p>${safeMessage}</p>
        ${
          normalizedMaidRefCode
            ? `<p><strong>Reference code:</strong> ${escapeHtml(normalizedMaidRefCode)}</p>`
            : ''
        }
      </div>
    `,
  })

  if (result.rejected.length > 0) {
    throw new MailDeliveryError('Mail server rejected the recipient', 'RECIPIENT_REJECTED')
  }

  if (result.pending.length > 0) {
    throw new MailDeliveryError('Mail delivery is pending', 'DELIVERY_PENDING')
  }
}

export const sendClientConfirmationCodeEmail = async (
  _to: string,
  _code: string
) => {
  // Disabled: replaced with Supabase email verification.
  return { ok: false as const, error: 'disabled' as const }
}
