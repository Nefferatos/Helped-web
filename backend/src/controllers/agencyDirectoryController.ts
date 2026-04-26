import { Request, Response } from 'express'
import { listAgencySummariesRecord } from '../repositories/agencyAdminRepository'

export const listAgencies = async (_req: Request, res: Response) => {
  try {
    const agencies = await listAgencySummariesRecord()
    res.status(200).json({ agencies })
  } catch (error) {
    console.error('Error fetching agencies:', error)
    res.status(500).json({ error: 'Failed to fetch agencies' })
  }
}
