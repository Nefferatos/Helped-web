import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { runDirectMatchingWorkflow } from '../services/workflowOrchestrationService'
import { logWorkflowDecision } from '../services/workflowLoggerService'
import { optionalString, positiveInteger } from '../services/workflowValidationService'
import { normalizeBudget } from '../services/workflowNormalizationService'
import { buildWorkflowResponse } from '../services/workflowResponseService'

export const matchMaids = async (req: Request, res: Response) => {
  const startedAt = Date.now()
  const requestId = optionalString(req.body.requestId, 120) || randomUUID()

  try {
    const result = await runDirectMatchingWorkflow({
      leadId:
        req.body.leadId === undefined ? undefined : positiveInteger(req.body.leadId, 'leadId'),
      inquiryId:
        req.body.inquiryId === undefined
          ? undefined
          : positiveInteger(req.body.inquiryId, 'inquiryId'),
      employerId:
        req.body.employerId === undefined
          ? undefined
          : positiveInteger(req.body.employerId, 'employerId'),
      message: optionalString(req.body.message),
      serviceType: optionalString(req.body.serviceType),
      location: optionalString(req.body.location),
      budget: req.body.budget ? normalizeBudget(String(req.body.budget)) : undefined,
      salary: req.body.salary ? normalizeBudget(String(req.body.salary)) : undefined,
      availability: optionalString(req.body.availability),
    })

    await logWorkflowDecision({
      requestId,
      workflow: 'inquiry_match',
      classifierOutput: {
        serviceType: req.body.serviceType ?? '',
        location: req.body.location ?? '',
      },
      endpointCalled: '/api/match',
      status: 'success',
      latency: Date.now() - startedAt,
      fallbackUsed: result.fallbackUsed,
    })

    res.status(200).json(
      buildWorkflowResponse({
        workflow: 'inquiry_match',
        intent: 'hiring',
        fallbackUsed: result.fallbackUsed,
        data: {
          requestId,
          ...result,
        },
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to match maids'
    const status = /positive integer/i.test(message) ? 400 : 500

    await logWorkflowDecision({
      requestId,
      workflow: 'inquiry_match',
      classifierOutput: { error: message },
      endpointCalled: '/api/match',
      status: 'failed',
      latency: Date.now() - startedAt,
      fallbackUsed: true,
    })

    res.status(status).json(
      buildWorkflowResponse({
        workflow: 'validation_error',
        intent: 'validation_error',
        fallbackUsed: true,
        data: { error: message, requestId },
      })
    )
  }
}
