import { Request, Response } from 'express'
import {
  MailConfigurationError,
  MailDeliveryError,
  sendTellFriendEmail,
} from '../email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_MAX_NAME_LENGTH = 100
const DEFAULT_MAX_SUBJECT_LENGTH = 200
const DEFAULT_MAX_MESSAGE_LENGTH = 5000
const DEFAULT_MAX_REF_CODE_LENGTH = 50
const DEFAULT_SEND_TIMEOUT_MS = 8000

const sanitizeInput = (value: string, maxLength: number) =>
  value.replace(/\r\n/g, '\n').replace(/\0/g, '').trim().slice(0, maxLength)

const getRequestString = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return ''
  return sanitizeInput(value, maxLength)
}

export const tellFriend = async (req: Request, res: Response) => {
  try {
    // Guard: if body is missing entirely (e.g. Content-Type header was wrong),
    // return a clear 400 instead of crashing or silently failing validation.
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Request body is missing or not valid JSON. Ensure Content-Type is application/json.',
      })
    }

    const body = req.body as {
      toName?: string
      toEmail?: string
      fromName?: string
      fromEmail?: string
      subject?: string
      message?: string
      maidRefCode?: string
    }

    const toName      = getRequestString(body.toName,      DEFAULT_MAX_NAME_LENGTH)
    const fromName    = getRequestString(body.fromName,    DEFAULT_MAX_NAME_LENGTH)
    const toEmail     = getRequestString(body.toEmail,     320).toLowerCase()
    const fromEmail   = getRequestString(body.fromEmail,   320).toLowerCase()
    const subject     = getRequestString(body.subject,     DEFAULT_MAX_SUBJECT_LENGTH)
    const message     = getRequestString(body.message,     DEFAULT_MAX_MESSAGE_LENGTH)
    const maidRefCode = getRequestString(body.maidRefCode, DEFAULT_MAX_REF_CODE_LENGTH)

    if (!toEmail || !fromEmail || !subject || !message) {
      return res.status(400).json({
        error: 'toEmail, fromEmail, subject, and message are required',
      })
    }

    if (!EMAIL_PATTERN.test(toEmail) || !EMAIL_PATTERN.test(fromEmail)) {
      return res.status(400).json({ error: 'Please enter valid email addresses' })
    }

    const timeoutMs = Number(process.env.MAIL_SEND_TIMEOUT_MS ?? DEFAULT_SEND_TIMEOUT_MS)

    await Promise.race([
      sendTellFriendEmail({
        toName,
        toEmail,
        fromName,
        fromEmail,
        subject,
        message,
        maidRefCode,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new MailDeliveryError('Email request timed out', 'DELIVERY_TIMEOUT')),
          timeoutMs
        )
      ),
    ])

    return res.status(200).json({ message: 'Email sent successfully' })
  } catch (error) {
    console.error('[tellFriend] Error sending email:', error)

    if (error instanceof MailConfigurationError) {
      return res.status(503).json({ error: 'Email service is temporarily unavailable' })
    }

    if (error instanceof MailDeliveryError) {
      if (error.code === 'DELIVERY_TIMEOUT') {
        return res.status(504).json({
          error: 'Email service timed out. The host may be blocking outbound SMTP connections.',
        })
      }
      return res.status(502).json({ error: 'Email could not be delivered right now' })
    }

    return res.status(500).json({ error: 'Failed to send email' })
  }
}