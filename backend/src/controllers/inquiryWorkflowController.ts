import { Request, Response } from 'express'
import { processInquiryWorkflow } from '../services/workflowOrchestrationService'
import { optionalString, positiveInteger, requiredString } from '../services/workflowValidationService'

export const handleInquiry = async (req: Request, res: Response) => {
  try {
    const message = requiredString(req.body.message, 'message')
    const name = optionalString(req.body.name, 200) || 'Unknown'
    const contact = optionalString(req.body.contact, 200) || ''
    const employerId =
      req.body.employerId === undefined
        ? undefined
        : positiveInteger(req.body.employerId, 'employerId')

    const result = await processInquiryWorkflow({
      message,
      name,
      contact,
      employerId,
    })

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process inquiry'
    const status = /required|positive integer/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}
