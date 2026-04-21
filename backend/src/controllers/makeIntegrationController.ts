import { Request, Response } from 'express'
import {
  fallbackOutboundMessage,
  forwardToMakeWebhook,
  normalizeBudget,
  saveLead,
  saveOutboundMessage,
} from '../services/makeIntegrationService'

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const sendToMake = async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body as { message?: unknown; userId?: unknown }
    const normalizedUserId = isNonEmptyString(userId) ? userId.trim() : 'anonymous'

    if (!isNonEmptyString(message)) {
      const fallback = await fallbackOutboundMessage(normalizedUserId)
      return res.status(202).json({
        success: true,
        fallback: true,
        message: 'Empty AI message received. Fallback message sent.',
        data: { fallbackMessage: fallback },
      })
    }

    const webhookResult = await forwardToMakeWebhook({
      message: message.trim(),
      userId: normalizedUserId,
    })

    if (!webhookResult.ok) {
      const fallback = await fallbackOutboundMessage(normalizedUserId)
      return res.status(202).json({
        success: true,
        fallback: true,
        message: 'Webhook unavailable. Fallback message sent.',
        data: {
          webhook: webhookResult,
          fallbackMessage: fallback,
        },
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Payload forwarded to Make.com webhook',
      data: webhookResult,
    })
  } catch (error) {
    console.error('Error forwarding payload to Make.com:', error)
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error && error.message === 'MAKE_WEBHOOK_URL_NOT_CONFIGURED'
          ? 'MAKE_WEBHOOK_URL is not configured on the server'
          : 'Failed to send payload to Make.com',
    })
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body as { message?: unknown; userId?: unknown }

    if (!isNonEmptyString(userId)) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      })
    }

    if (!isNonEmptyString(message)) {
      const fallback = await fallbackOutboundMessage(userId.trim())
      return res.status(202).json({
        success: true,
        fallback: true,
        message: 'Empty message rejected. Fallback message stored instead.',
        data: fallback,
      })
    }

    const savedMessage = await saveOutboundMessage({ message: message.trim(), userId: userId.trim() })

    return res.status(201).json({
      success: true,
      message: 'Message stored successfully',
      data: savedMessage,
    })
  } catch (error) {
    console.error('Error saving outbound message:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to store outbound message',
    })
  }
}

export const createLead = async (req: Request, res: Response) => {
  try {
    const { service, budget, location, urgency } = req.body as {
      service?: unknown
      budget?: unknown
      location?: unknown
      urgency?: unknown
    }

    const parsedBudget = normalizeBudget(budget)
    const normalizedUserId = isNonEmptyString((req.body as { userId?: unknown }).userId)
      ? String((req.body as { userId?: unknown }).userId).trim()
      : 'anonymous'

    if (
      !isNonEmptyString(service) ||
      !isNonEmptyString(location) ||
      !isNonEmptyString(urgency) ||
      parsedBudget === null
    ) {
      const fallback = await fallbackOutboundMessage(normalizedUserId)
      return res.status(202).json({
        success: true,
        fallback: true,
        message: 'Lead payload incomplete. Fallback message sent.',
        data: { fallbackMessage: fallback },
      })
    }

    const lead = await saveLead({
      service: service.trim(),
      budget: parsedBudget,
      location: location.trim(),
      urgency: urgency.trim(),
    })

    return res.status(201).json({
      success: true,
      message: 'Lead stored successfully',
      data: lead,
    })
  } catch (error) {
    console.error('Error creating lead:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to save lead',
    })
  }
}
