import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { processInquiryWithAiOrchestrator } from '../services/aiOrchestratorService'
import {
  optionalString,
  positiveInteger,
  requiredString,
} from '../services/workflowValidationService'
import {
  assertNoLegacyWorkflowResponse,
  normalizeWorkflow,
} from '../services/workflowNameService'
import { buildWorkflowResponse } from '../services/workflowResponseService'

export const processInquiry = async (req: Request, res: Response) => {
  try {
    const requestId = optionalString(req.body.requestId, 120) || randomUUID()
    const result = await processInquiryWithAiOrchestrator({
      requestId,
      message: requiredString(req.body.message, 'message'),
      name: optionalString(req.body.name, 200) || 'Unknown',
      contact: optionalString(req.body.contact, 200) || '',
      employerId:
        req.body.employerId === undefined
          ? undefined
          : positiveInteger(req.body.employerId, 'employerId'),
    })

    const responseBody = {
      ...result,
      inquiry: {
        ...result.inquiry,
        workflow: normalizeWorkflow(result.inquiry.workflow),
      },
      workflow: normalizeWorkflow(result.workflow),
      classifier: {
        ...result.classifier,
        workflow: normalizeWorkflow(result.classifier.workflow),
      },
    }

    const envelope = buildWorkflowResponse({
      workflow: responseBody.workflow,
      intent: responseBody.inquiry.intent,
      fallbackUsed: responseBody.fallbackUsed,
      fallbackProvider: responseBody.fallbackProvider,
      data: responseBody,
    })

    assertNoLegacyWorkflowResponse(
      envelope,
      process.env.NODE_ENV === 'production' ? 'production' : 'development'
    )

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
