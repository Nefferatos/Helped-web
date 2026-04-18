import { Request, Response } from 'express'
import {
  deleteEmployerContractStore,
  getEmployerContractStore,
  getEmployerContractsStore,
  saveEmployerContractStore,
} from '../store'

export const listEmployerContracts = async (_req: Request, res: Response) => {
  try {
    const employers = await getEmployerContractsStore()
    res.status(200).json({ employers })
  } catch (error) {
    console.error('Error fetching employer contracts:', error)
    res.status(500).json({ error: 'Failed to fetch employer contracts' })
  }
}

export const getEmployerContract = async (req: Request, res: Response) => {
  try {
    const { refCode } = req.params
    const employer = await getEmployerContractStore(refCode)
    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' })
    }
    res.status(200).json({ employer })
  } catch (error) {
    console.error('Error fetching employer contract:', error)
    res.status(500).json({ error: 'Failed to fetch employer contract' })
  }
}

export const saveEmployerContract = async (req: Request, res: Response) => {
  try {
    const { refCode, maid, agency, employer, spouse, familyMembers, notificationDate, documents } = req.body as {
      refCode?: string | null
      maid?: Record<string, unknown>
      agency?: Record<string, unknown>
      employer?: Record<string, unknown>
      spouse?: Record<string, unknown>
      familyMembers?: Array<Record<string, unknown>>
      notificationDate?: Record<string, unknown>
      documents?: Array<{
        category?: string
        fileUrl?: string
        fileName?: string
      }>
    }

    const employerName = String((employer as { name?: unknown } | undefined)?.name ?? '').trim()
    if (!employerName) {
      return res.status(400).json({ error: 'employer.name is required' })
    }

    const saved = await saveEmployerContractStore({
      refCode,
      maid,
      agency,
      employer,
      spouse,
      familyMembers,
      notificationDate,
      documents,
    })
    res.status(200).json({
      employer: saved,
      employmentContract: {
        refCode: saved.refCode,
        caseReferenceNumber: String((saved.agency as { caseReferenceNumber?: unknown })?.caseReferenceNumber ?? saved.refCode),
        contractDate: String((saved.agency as { contractDate?: unknown })?.contractDate ?? ''),
        serviceFee: String((saved.agency as { serviceFee?: unknown })?.serviceFee ?? ''),
        placementFee: String((saved.agency as { placementFee?: unknown })?.placementFee ?? ''),
        agencyWitness: String((saved.agency as { agencyWitness?: unknown })?.agencyWitness ?? ''),
      },
    })
  } catch (error) {
    console.error('Error saving employer contract:', error)
    res.status(500).json({ error: 'Failed to save employer contract' })
  }
}

export const deleteEmployerContract = async (req: Request, res: Response) => {
  try {
    const { refCode } = req.params
    const deleted = await deleteEmployerContractStore(refCode)
    if (!deleted) {
      return res.status(404).json({ error: 'Employer not found' })
    }
    res.status(200).json({ message: 'Employer deleted successfully' })
  } catch (error) {
    console.error('Error deleting employer contract:', error)
    res.status(500).json({ error: 'Failed to delete employer contract' })
  }
}
