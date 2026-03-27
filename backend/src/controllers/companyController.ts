// Company Controller
// Handles all business logic for company profile, MOM personnel, and testimonials

import { Request, Response } from 'express'
import {
  addMomPersonnelStore,
  addTestimonialStore,
  deleteMomPersonnelStore,
  deleteTestimonialStore,
  getCompanyBundle,
  getDirectSalesStore,
  getEnquiriesStore,
  getMaidsStore,
  getUnreadAgencyChatCountStore,
  updateCompanyProfileStore,
  updateMomPersonnelStore,
} from '../store'

interface CompanyProfile {
  id?: number
  company_name: string
  short_name: string
  license_no: string
  address_line1: string
  address_line2?: string
  postal_code: string
  country: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  contact_fax?: string
  contact_website?: string
  office_hours_regular?: string
  office_hours_other?: string
  social_facebook?: string
  social_whatsapp_number?: string
  social_whatsapp_message?: string
  branding_theme_color?: string
  branding_button_color?: string
  about_us?: string
  logo_data_url?: string
  gallery_image_data_urls?: string[]
  intro_video_data_url?: string
}

/**
 * GET /api/company
 * Fetch complete company profile including MOM personnel and testimonials
 */
export const getCompanyProfile = async (req: Request, res: Response) => {
  try {
    const response = await getCompanyBundle()
    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching company profile:', error)
    res.status(500).json({ error: 'Failed to fetch company profile' })
  }
}

export const getCompanySummary = async (req: Request, res: Response) => {
  try {
    const [companyBundle, maids, enquiries, directSales, unreadAgencyChats] = await Promise.all([
      getCompanyBundle(),
      getMaidsStore(),
      getEnquiriesStore(),
      getDirectSalesStore(),
      getUnreadAgencyChatCountStore(),
    ])

    const publicMaids = maids.filter((maid) => maid.isPublic).length
    const hiddenMaids = maids.length - publicMaids
    const maidsWithPhotos = maids.filter(
      (maid) =>
        maid.hasPhoto ||
        Boolean(
          (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0) ||
            maid.photoDataUrl
        )
    ).length

    res.status(200).json({
      publicMaids,
      hiddenMaids,
      totalMaids: maids.length,
      maidsWithPhotos,
      enquiries: enquiries.length,
      requests: directSales.length,
      pendingRequests: directSales.filter((request) => request.status === 'pending').length,
      unreadAgencyChats,
      momPersonnel: companyBundle.momPersonnel.length,
      testimonials: companyBundle.testimonials.length,
      galleryImages: companyBundle.companyProfile.gallery_image_data_urls?.length ?? 0,
    })
  } catch (error) {
    console.error('Error fetching company summary:', error)
    res.status(500).json({ error: 'Failed to fetch company summary' })
  }
}

/**
 * PUT /api/company
 * Update company profile information
 * Accepts JSON body with company profile fields to update
 */
export const updateCompanyProfile = async (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<CompanyProfile>

    // Build dynamic UPDATE query based on provided fields
    const fields: string[] = []
    const values: unknown[] = []
    let paramCounter = 1

    // Only include fields that were provided in the request
    const allowedFields = [
      'company_name',
      'short_name',
      'license_no',
      'address_line1',
      'address_line2',
      'postal_code',
      'country',
      'contact_person',
      'contact_phone',
      'contact_email',
      'contact_fax',
      'contact_website',
      'office_hours_regular',
      'office_hours_other',
      'social_facebook',
      'social_whatsapp_number',
      'social_whatsapp_message',
      'branding_theme_color',
      'branding_button_color',
      'about_us',
      'logo_data_url',
      'gallery_image_data_urls',
      'intro_video_data_url',
    ]

    for (const field of allowedFields) {
      const value = updates[field as keyof CompanyProfile]
      if (value !== undefined) {
        fields.push(`${field} = $${paramCounter}`)
        values.push(value)
        paramCounter++
      }
    }

    // If no fields to update, return error
    if (fields.length === 0) {
      return res
        .status(400)
        .json({ error: 'No valid fields provided for update' })
    }

    // Add updated_at timestamp
    fields.push(`updated_at = $${paramCounter}`)
    values.push(new Date())
    paramCounter++

    // Add company ID to where clause
    values.push(1) // Company ID = 1 (first company)

    const updateMap = Object.fromEntries(
      allowedFields
        .map((field) => [field, updates[field as keyof CompanyProfile]])
        .filter(([, value]) => value !== undefined)
    )

    const updatedProfile = await updateCompanyProfileStore(
      updateMap as Partial<CompanyProfile>
    )

    res.status(200).json({
      message: 'Company profile updated successfully',
      companyProfile: updatedProfile,
    })
  } catch (error) {
    console.error('Error updating company profile:', error)
    res.status(500).json({ error: 'Failed to update company profile' })
  }
}

/**
 * POST /api/company/mom-personnel
 * Add a new MOM personnel entry
 */
export const addMOMPersonnel = async (req: Request, res: Response) => {
  try {
    const { name, registration_number } = req.body

    if (!name || !registration_number) {
      return res
        .status(400)
        .json({ error: 'Name and registration number are required' })
    }

    const result = await addMomPersonnelStore(name, registration_number)

    res.status(201).json({
      message: 'MOM personnel added successfully',
      momPersonnel: result,
    })
  } catch (error) {
    console.error('Error adding MOM personnel:', error)
    res.status(500).json({ error: 'Failed to add MOM personnel' })
  }
}

/**
 * PUT /api/company/mom-personnel/:id
 * Update MOM personnel entry
 */
export const updateMOMPersonnel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, registration_number } = req.body

    if (!name && !registration_number) {
      return res.status(400).json({
        error: 'At least one field (name or registration_number) is required',
      })
    }

    const result = await updateMomPersonnelStore(Number(id), {
      ...(name !== undefined ? { name } : {}),
      ...(registration_number !== undefined ? { registration_number } : {}),
    })

    if (!result) {
      return res.status(404).json({ error: 'MOM personnel not found' })
    }

    res.status(200).json({
      message: 'MOM personnel updated successfully',
      momPersonnel: result,
    })
  } catch (error) {
    console.error('Error updating MOM personnel:', error)
    res.status(500).json({ error: 'Failed to update MOM personnel' })
  }
}

/**
 * DELETE /api/company/mom-personnel/:id
 * Delete MOM personnel entry
 */
export const deleteMOMPersonnel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await deleteMomPersonnelStore(Number(id))

    if (!result) {
      return res.status(404).json({ error: 'MOM personnel not found' })
    }

    res.status(200).json({
      message: 'MOM personnel deleted successfully',
      deletedMOMPersonnel: result,
    })
  } catch (error) {
    console.error('Error deleting MOM personnel:', error)
    res.status(500).json({ error: 'Failed to delete MOM personnel' })
  }
}

/**
 * POST /api/company/testimonials
 * Add a new testimonial
 */
export const addTestimonial = async (req: Request, res: Response) => {
  try {
    const { message, author } = req.body

    if (!message || !author) {
      return res
        .status(400)
        .json({ error: 'Message and author are required' })
    }

    const result = await addTestimonialStore(message, author)

    res.status(201).json({
      message: 'Testimonial added successfully',
      testimonial: result,
    })
  } catch (error) {
    console.error('Error adding testimonial:', error)
    res.status(500).json({ error: 'Failed to add testimonial' })
  }
}

/**
 * DELETE /api/company/testimonials/:id
 * Delete testimonial
 */
export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await deleteTestimonialStore(Number(id))

    if (!result) {
      return res.status(404).json({ error: 'Testimonial not found' })
    }

    res.status(200).json({
      message: 'Testimonial deleted successfully',
      deletedTestimonial: result,
    })
  } catch (error) {
    console.error('Error deleting testimonial:', error)
    res.status(500).json({ error: 'Failed to delete testimonial' })
  }
}
