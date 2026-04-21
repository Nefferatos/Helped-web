import { Request, Response } from 'express'
import {
  generateContractWorkflow,
  runDirectMatchingWorkflow,
  scheduleInterviewWorkflow,
} from '../services/workflowOrchestrationService'
import {
  optionalString,
  positiveInteger,
} from '../services/workflowValidationService'
import { normalizeBudget } from '../services/workflowNormalizationService'

export const matchMaids = async (req: Request, res: Response) => {
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

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to match maids'
    const status = /positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const result = await scheduleInterviewWorkflow({
      maidId: positiveInteger(req.body.maidId, 'maidId'),
      employerId: positiveInteger(req.body.employerId, 'employerId'),
      datetime: optionalString(req.body.datetime) || new Date().toISOString(),
    })

    res.status(201).json({ schedule: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to schedule interview'
    if (message === 'MAID_NOT_FOUND') {
      return res.status(404).json({ error: 'Maid not found' })
    }
    const status = /positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const generateContract = async (req: Request, res: Response) => {
  try {
    const result = await generateContractWorkflow({
      maidId: positiveInteger(req.body.maidId, 'maidId'),
      employerId: positiveInteger(req.body.employerId, 'employerId'),
      serviceType: optionalString(req.body.serviceType),
      location: optionalString(req.body.location),
      budgetText: optionalString(req.body.budgetText),
      scheduleDate: optionalString(req.body.scheduleDate),
    })

    res.status(201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate contract'
    const status = /positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}
