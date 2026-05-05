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
import {
  assertNoLegacyWorkflowResponse,
  normalizeWorkflow,
} from '../services/workflowNameService'
import { buildWorkflowResponse } from '../services/workflowResponseService'

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

const normalizeInquiryResult = <T extends {
  inquiry: { workflow: string }
  workflow?: string
  classifier?: { workflow?: string }
}>(result: T) => {
  const normalizedWorkflow = normalizeWorkflow(result.inquiry.workflow)

  const normalized = {
    ...result,
    inquiry: {
      ...result.inquiry,
      workflow: normalizedWorkflow,
    },
    workflow: normalizedWorkflow,
    classifier: result.classifier
      ? {
          ...result.classifier,
          workflow: result.classifier.workflow
            ? normalizeWorkflow(result.classifier.workflow)
            : normalizedWorkflow,
        }
      : result.classifier,
  }

  assertNoLegacyWorkflowResponse(
    normalized,
    process.env.NODE_ENV === 'production' ? 'production' : 'development'
  )

  return normalized
}

export const handleInquiry = async (req: Request, res: Response) => {
  try {
    const result = normalizeInquiryResult(
      await processInquiryWorkflow(parseInquiryRequest(req))
    )

    const envelope = buildWorkflowResponse({
      workflow: result.workflow,
      intent: result.inquiry.intent,
      fallbackUsed: result.fallbackUsed,
      fallbackProvider: result.fallbackProvider,
      data: result,
    })

    res.status(200).json(envelope)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process inquiry'
    const status = /required|positive integer/i.test(message) ? 400 : 500
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

export const handleInquiryForMake = async (req: Request, res: Response) => {
  try {
    const input = parseInquiryRequest(req)
    const result = normalizeInquiryResult(await processInquiryWorkflow(input))

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

    const responseBody = {
      inquiry: result.inquiry,
      matches: result.matches,
      reply: result.reply,
      workflow: normalizeWorkflow(result.workflow),
      fallbackUsed: result.fallbackUsed,
      fallbackProvider: result.fallbackProvider,
      makeTriggered: makeResult.ok,
      makeDelivery: makeResult.delivery,
    }

    assertNoLegacyWorkflowResponse(
      responseBody,
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    )

    res.status(200).json(
      buildWorkflowResponse({
        workflow: responseBody.workflow,
        intent: result.inquiry.intent,
        fallbackUsed: result.fallbackUsed,
        fallbackProvider: result.fallbackProvider,
        data: responseBody,
      })
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process inquiry for Make'
    const status = /required|positive integer/i.test(message) ? 400 : 500
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
