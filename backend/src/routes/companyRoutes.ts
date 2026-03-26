// Company Routes
// Define all API endpoints for company profile operations

import express, { Router } from 'express'
import {
  getCompanyProfile,
  getCompanySummary,
  updateCompanyProfile,
  addMOMPersonnel,
  updateMOMPersonnel,
  deleteMOMPersonnel,
  addTestimonial,
  deleteTestimonial,
} from '../controllers/companyController'

const router: Router = express.Router()

// ==================== Company Profile Routes ====================

/**
 * GET /api/company
 * Fetch complete company profile including MOM personnel and testimonials
 */
router.get('/', getCompanyProfile)
router.get('/summary', getCompanySummary)

/**
 * PUT /api/company
 * Update company profile information
 * Body: JSON object with fields to update
 */
router.put('/', updateCompanyProfile)

// ==================== MOM Personnel Routes ====================

/**
 * POST /api/company/mom-personnel
 * Add a new MOM personnel entry
 * Body: { name: string, registration_number: string }
 */
router.post('/mom-personnel', addMOMPersonnel)

/**
 * PUT /api/company/mom-personnel/:id
 * Update specific MOM personnel entry
 * Params: id (personnel ID)
 * Body: { name?: string, registration_number?: string }
 */
router.put('/mom-personnel/:id', updateMOMPersonnel)

/**
 * DELETE /api/company/mom-personnel/:id
 * Delete specific MOM personnel entry
 * Params: id (personnel ID)
 */
router.delete('/mom-personnel/:id', deleteMOMPersonnel)

// ==================== Testimonials Routes ====================

/**
 * POST /api/company/testimonials
 * Add a new testimonial
 * Body: { message: string, author: string }
 */
router.post('/testimonials', addTestimonial)

/**
 * DELETE /api/company/testimonials/:id
 * Delete specific testimonial
 * Params: id (testimonial ID)
 */
router.delete('/testimonials/:id', deleteTestimonial)

export default router
