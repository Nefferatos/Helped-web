import { Request, Response } from 'express'
import {
  sendMessageWorkflow,
  sendNotificationWorkflow,
  sendWorkflowToMake,
} from '../services/workflowOrchestrationService'
import {
  optionalString,
  parseNotificationChannel,
  sanitizePayload,
  requiredString,
} from '../services/workflowValidationService'
import { buildWorkflowResponse } from '../services/workflowResponseService'

export const notifyWorkflow = async (req: Request, res: Response) => {
  try {
    const result = await sendNotificationWorkflow({
      channel: parseNotificationChannel(req.body.channel),
      recipient: requiredString(req.body.recipient, 'recipient', 300),
      message: requiredString(req.body.message, 'message'),
      referenceType: optionalString(req.body.referenceType, 100) || 'workflow',
      referenceId: optionalString(req.body.referenceId, 100),
    })

    res.status(201).json(
      buildWorkflowResponse({
        workflow: 'notification_only',
        intent: 'notification',
        fallbackUsed: false,
        data: result,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send notification'
    const status = /required|channel must/i.test(message) ? 400 : 500
    res.status(status).json(
      buildWorkflowResponse({
        workflow: 'validation_error',
        intent: 'validation_error',
        fallbackUsed: true,
        data: { error: message },
      })
    )
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const result = await sendMessageWorkflow({
      recipient: requiredString(req.body.recipient, 'recipient', 300),
      message: requiredString(req.body.message, 'message'),
      channel:
        req.body.channel === undefined
          ? 'internal'
          : parseNotificationChannel(req.body.channel),
    })

    res.status(201).json(
      buildWorkflowResponse({
        workflow: 'notification_only',
        intent: 'notification',
        fallbackUsed: false,
        data: result,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    const status = /required|channel must/i.test(message) ? 400 : 500
    res.status(status).json(
      buildWorkflowResponse({
        workflow: 'validation_error',
        intent: 'validation_error',
        fallbackUsed: true,
        data: { error: message },
      })
    )
  }
}

export const sendToMake = async (req: Request, res: Response) => {
  try {
    const result = await sendWorkflowToMake({
      scenario: requiredString(req.body.scenario, 'scenario', 100),
      payload: sanitizePayload(req.body.payload),
      url: optionalString(req.body.url, 1000),
    })

    res.status(result.ok ? 200 : 502).json(
      buildWorkflowResponse({
        workflow: 'notification_only',
        intent: 'notification',
        fallbackUsed: !result.ok,
        data: result,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send to Make'
    const status = /required/i.test(message) ? 400 : 500
    res.status(status).json(
      buildWorkflowResponse({
        workflow: 'validation_error',
        intent: 'validation_error',
        fallbackUsed: true,
        data: { error: message },
      })
    )
  }
}
