import { Request, Response } from 'express'
import {
  createDirectSaleStore,
  getClientOptionsStore,
  getDirectSalesStore,
  updateDirectSaleStatusStore,
} from '../store'

export const getDirectSales = async (req: Request, res: Response) => {
  try {
    const directSales = await getDirectSalesStore()
    res.status(200).json({ directSales })
  } catch (error) {
    console.error('Error fetching direct sales:', error)
    res.status(500).json({ error: 'Failed to fetch direct sales' })
  }
}

export const getClientOptions = async (req: Request, res: Response) => {
  try {
    const clients = await getClientOptionsStore()
    res.status(200).json({ clients })
  } catch (error) {
    console.error('Error fetching client options:', error)
    res.status(500).json({ error: 'Failed to fetch client options' })
  }
}

export const createDirectSale = async (req: Request, res: Response) => {
  try {
    const { referenceCode: routeReferenceCode } = req.params
    const { referenceCode: bodyReferenceCode, clientId, status, formData } = req.body as {
      referenceCode?: string
      clientId?: number
      status?: string
      formData?: Record<string, string>
    }
    const referenceCode = routeReferenceCode || bodyReferenceCode

    if (!referenceCode?.trim()) {
      return res.status(400).json({ error: 'referenceCode is required' })
    }

    // Allow GENERAL requests without a clientId (submitted from the client requests page
    // by users who may not be logged in or have no account-linked id).
    const isGeneral = referenceCode.trim().toUpperCase() === 'GENERAL'
    if (!isGeneral && !Number.isInteger(clientId)) {
      return res.status(400).json({ error: 'clientId is required' })
    }

    const normalizedStatus =
      status === 'interested'
        ? 'interested'
        : status === 'direct_hire'
        ? 'direct_hire'
        : status === 'rejected'
        ? 'rejected'
        : 'pending'

    const result = await createDirectSaleStore(
      referenceCode,
      clientId != null ? Number(clientId) : 0,
      normalizedStatus,
      formData
    )

    res.status(201).json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'MAID_NOT_FOUND') {
      return res.status(404).json({ error: 'Maid not found' })
    }

    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Client not found' })
    }

    console.error('Error creating direct sale:', error)
    res.status(500).json({ error: 'Failed to create direct sale' })
  }
}

export const markDirectSaleInterested = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid direct sale id is required' })
    }

    const result = await updateDirectSaleStatusStore(id, 'interested')

    if (!result) {
      return res.status(404).json({ error: 'Direct sale not found' })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Error updating direct sale status:', error)
    res.status(500).json({ error: 'Failed to update direct sale status' })
  }
}

export const markDirectSaleDirectHire = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid direct sale id is required' })
    }

    const result = await updateDirectSaleStatusStore(id, 'direct_hire')

    if (!result) {
      return res.status(404).json({ error: 'Direct sale not found' })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Error updating direct sale status:', error)
    res.status(500).json({ error: 'Failed to update direct sale status' })
  }
}

export const markDirectSaleRejected = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid direct sale id is required' })
    }

    const result = await updateDirectSaleStatusStore(id, 'rejected')

    if (!result) {
      return res.status(404).json({ error: 'Direct sale not found' })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Error updating direct sale status:', error)
    res.status(500).json({ error: 'Failed to update direct sale status' })
  }
}