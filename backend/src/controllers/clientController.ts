import { Request, Response } from 'express'
import { getAuthenticatedClient } from '../auth'
import {
  getAssignedMaidsForClientStore,
  updateDirectSaleStatusForClientStore,
} from '../store'

export const getMyAssignedMaids = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const assignments = await getAssignedMaidsForClientStore(client.id)
    res.status(200).json({ assignments })
  } catch (error) {
    console.error('Error fetching assigned maids:', error)
    res.status(500).json({ error: 'Failed to fetch assigned maids' })
  }
}

const updateClientAssignmentStatus = async (
  req: Request,
  res: Response,
  status: string
) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid direct sale id is required' })
    }

    const result = await updateDirectSaleStatusForClientStore(
      id,
      client.id,
      status
    )
    if (!result) {
      return res
        .status(404)
        .json({ error: 'Assigned direct sale not found for this client' })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Error updating client assignment status:', error)
    res.status(500).json({ error: 'Failed to update assignment status' })
  }
}

export const markMyAssignmentInterested = async (req: Request, res: Response) =>
  updateClientAssignmentStatus(req, res, 'interested')

export const markMyAssignmentDirectHire = async (
  req: Request,
  res: Response
) => updateClientAssignmentStatus(req, res, 'direct_hire')

export const markMyAssignmentRejected = async (req: Request, res: Response) =>
  updateClientAssignmentStatus(req, res, 'rejected')
