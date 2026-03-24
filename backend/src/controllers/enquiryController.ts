import { Request, Response } from 'express'
import {
  addEnquiryStore,
  deleteEnquiryStore,
  getEnquiriesStore,
} from '../store'

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const { search } = req.query
    const enquiries = await getEnquiriesStore(
      typeof search === 'string' ? search : undefined
    )
    res.status(200).json({ enquiries })
  } catch (error) {
    console.error('Error fetching enquiries:', error)
    res.status(500).json({ error: 'Failed to fetch enquiries' })
  }
}

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const { username, date, email, phone, message } = req.body as {
      username?: string
      date?: string
      email?: string
      phone?: string
      message?: string
    }

    if (!username || !email || !phone || !message) {
      return res
        .status(400)
        .json({ error: 'username, email, phone, and message are required' })
    }

    const enquiry = await addEnquiryStore({
      username,
      date:
        date ||
        new Date().toLocaleString('en-SG', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      email,
      phone,
      message,
    })

    res.status(201).json({ enquiry })
  } catch (error) {
    console.error('Error creating enquiry:', error)
    res.status(500).json({ error: 'Failed to create enquiry' })
  }
}

export const deleteEnquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await deleteEnquiryStore(Number(id))

    if (!deleted) {
      return res.status(404).json({ error: 'Enquiry not found' })
    }

    res.status(200).json({ message: 'Enquiry deleted successfully' })
  } catch (error) {
    console.error('Error deleting enquiry:', error)
    res.status(500).json({ error: 'Failed to delete enquiry' })
  }
}
