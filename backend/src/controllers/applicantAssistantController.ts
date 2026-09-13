import { Request, Response } from 'express'
import { sendMessage, getTrackerStatus, createTrackerFromApplicants } from '../services/applicantAssistantService'

export const chat = async (req: Request, res: Response) => {
  try {
    const { conversationId, message, selectedApplicantIds, currentFilters, currentSearch } = req.body
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }
    const result = await sendMessage(req, {
      conversationId: typeof conversationId === 'string' ? conversationId : undefined,
      message: message.trim(),
      selectedApplicantIds: Array.isArray(selectedApplicantIds) ? selectedApplicantIds : undefined,
      currentFilters: currentFilters && typeof currentFilters === 'object' ? currentFilters : undefined,
      currentSearch: typeof currentSearch === 'string' ? currentSearch : undefined,
    })
    if (result.duplicate) {
      return res.status(200).json({ ...result, message: 'Request already processed.' })
    }
    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message === 'UNAUTHORIZED' ? 401 : 500
    res.status(status).json({ error: message })
  }
}

export const getTracker = async (req: Request, res: Response) => {
  try {
    const trackerId = typeof req.query.trackerId === 'string' ? req.query.trackerId : undefined
    const result = await getTrackerStatus(req, trackerId)
    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    let status = 500
    if (message === 'UNAUTHORIZED') status = 401
    else if (message === 'TRACKER_NOT_FOUND') status = 404
    res.status(status).json({ error: message })
  }
}

export const createTracker = async (req: Request, res: Response) => {
  try {
    const { applicantIds, name, filters } = req.body
    const tracker = await createTrackerFromApplicants(req, {
      applicantIds: Array.isArray(applicantIds) ? applicantIds : undefined,
      name: typeof name === 'string' ? name : undefined,
      filters: filters && typeof filters === 'object' ? filters : undefined,
    })
    res.status(201).json(tracker)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message === 'UNAUTHORIZED' ? 401 : 500
    res.status(status).json({ error: message })
  }
}