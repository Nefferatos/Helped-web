import { Request, Response } from 'express'
import {
  processInquiryWorkflow,
  sendWorkflowToMake,
} from '../services/workflowOrchestrationService'
import {
  optionalString,
  positiveInteger,
  requiredString,
  sanitizePayload,
} from '../services/workflowValidationService'

const parseInquiryRequest = (req: Request) => {
  const message = requiredString(req.body.message, 'message')
  const name = optionalString(req.body.name, 200) || 'Unknown'
  const contact = optionalString(req.body.contact, 200) || ''
  const employerId =
    req.body.employerId === undefined
      ? undefined
      : positiveInteger(req.body.employerId, 'employerId')

  return {
    message,
    name,
    contact,
    employerId,
  }
}

export const handleInquiry = async (req: Request, res: Response) => {
  try {
    const result = await processInquiryWorkflow(parseInquiryRequest(req))

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process inquiry'
    const status = /required|positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const handleInquiryForMake = async (req: Request, res: Response) => {
  try {
    const input = parseInquiryRequest(req)
    const result = await processInquiryWorkflow(input)

    const makeResult = await sendWorkflowToMake({
      scenario: optionalString(req.body.makeScenario, 100) || 'inquiry_pipeline',
      url: optionalString(req.body.makeUrl, 1000),
      payload: {
        event: 'inquiry.processed',
        inquiryId: result.inquiry.id,
        intent: result.inquiry.intent,
        workflow: result.inquiry.workflow,
        aiUsed: result.inquiry.aiUsed,
        matches: result.matches ?? [],
        reply: result.reply,
        name: input.name,
        contact: input.contact,
        message: input.message,
        employerId: input.employerId ?? null,
        source: optionalString(req.body.source, 100) || 'make_ai_agent',
        channel: optionalString(req.body.channel, 100) || 'webhook',
        conversationId: optionalString(req.body.conversationId, 200),
        messageId: optionalString(req.body.messageId, 200),
        receivedAt: optionalString(req.body.receivedAt, 100),
        metadata: sanitizePayload(req.body.metadata),
      },
    })

    res.status(200).json({
      inquiry: result.inquiry,
      matches: result.matches,
      reply: result.reply,
      makeTriggered: makeResult.ok,
      makeDelivery: makeResult.delivery,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process inquiry for Make'
    const status = /required|positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}
