import { Request, Response } from 'express'
import { createStructuredLead, processRawLead } from '../services/workflowOrchestrationService'
import { listWorkflowLeadsStore } from '../store/workflowStore'
import {
  parseLeadClassification,
  parseLeadSource,
  requiredString,
} from '../services/workflowValidationService'
import { normalizeBudget, normalizeLocation, normalizeServiceType, normalizeUrgency } from '../services/workflowNormalizationService'

export const ingestRawLead = async (req: Request, res: Response) => {
  try {
    const source = parseLeadSource(req.body.source)
    const message = requiredString(req.body.message, 'message')
    const name = requiredString(req.body.name, 'name', 200)
    const contact = requiredString(req.body.contact, 'contact', 200)

    const result = await processRawLead({
      source,
      message,
      name,
      contact,
    })

    res.status(201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ingest lead'
    const status = /required|source must/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const createLead = async (req: Request, res: Response) => {
  try {
    const lead = await createStructuredLead({
      source: parseLeadSource(req.body.source),
      name: requiredString(req.body.name, 'name', 200),
      contact: requiredString(req.body.contact, 'contact', 200),
      message: requiredString(req.body.message, 'message'),
      serviceType: normalizeServiceType(requiredString(req.body.serviceType, 'serviceType')),
      budget: normalizeBudget(requiredString(req.body.budgetText ?? req.body.budget, 'budget')),
      urgency: normalizeUrgency(String(req.body.urgency ?? 'normal')),
      location: normalizeLocation(String(req.body.location ?? 'Singapore')),
      score: Number(req.body.score ?? 0),
      classification: parseLeadClassification(req.body.classification),
      aiSummary: requiredString(req.body.aiSummary ?? req.body.summary, 'aiSummary'),
      qualificationReasons: Array.isArray(req.body.qualificationReasons)
        ? req.body.qualificationReasons.map((reason: unknown) => String(reason))
        : [],
    })

    res.status(201).json({ lead })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create lead'
    const status = /required|must/i.test(message) ? 400 : 500
    res.status(status).json({ error: message })
  }
}

export const listLeads = async (_req: Request, res: Response) => {
  try {
    const leads = await listWorkflowLeadsStore()
    res.status(200).json({ leads })
  } catch (error) {
    console.error('Error listing leads:', error)
    res.status(500).json({ error: 'Failed to list leads' })
  }
}
