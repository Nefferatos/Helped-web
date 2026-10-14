import { Request, Response } from 'express'
import { getAuthenticatedClient } from '../auth'
import {
  buildAgencyRatingSummary,
  deleteAgencyReviewStore,
  listAgencyReviewsStore,
  upsertAgencyReviewStore,
} from '../store'

const parseAgencyId = (value: string) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

// Public: list an agency's reviews with the Google-Maps-style rating summary.
export const listAgencyReviews = async (req: Request, res: Response) => {
  try {
    const agencyId = parseAgencyId(req.params.agencyId)
    if (agencyId === null) {
      return res.status(400).json({ error: 'Valid agency id is required' })
    }

    const reviews = await listAgencyReviewsStore(agencyId)
    return res.status(200).json({
      summary: buildAgencyRatingSummary(reviews, agencyId),
      reviews,
    })
  } catch (error) {
    console.error('Error fetching agency reviews:', error)
    return res.status(500).json({ error: 'Failed to fetch agency reviews' })
  }
}

// Client: create or update the signed-in client's own review for an agency.
export const saveAgencyReview = async (req: Request, res: Response) => {
  try {
    const agencyId = parseAgencyId(req.params.agencyId)
    if (agencyId === null) {
      return res.status(400).json({ error: 'Valid agency id is required' })
    }

    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Please log in to rate this agency' })
    }

    const body = (req.body ?? {}) as { rating?: unknown; comment?: unknown }
    const rating = Math.round(Number(body.rating))
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: 'Rating must be between 1 and 5 stars' })
    }
    const comment = String(body.comment ?? '')
      .trim()
      .slice(0, 1000)

    const clientName =
      client.name?.trim() ||
      client.company?.trim() ||
      client.email?.trim() ||
      'Verified client'

    const { review, created } = await upsertAgencyReviewStore({
      agencyId,
      clientId: client.id,
      clientName,
      rating,
      comment,
    })

    const reviews = await listAgencyReviewsStore(agencyId)
    return res.status(created ? 201 : 200).json({
      message: 'Review saved',
      review,
      summary: buildAgencyRatingSummary(reviews, agencyId),
    })
  } catch (error) {
    console.error('Error saving agency review:', error)
    return res.status(500).json({ error: 'Failed to save agency review' })
  }
}

// Client: remove the signed-in client's own review.
export const removeAgencyReview = async (req: Request, res: Response) => {
  try {
    const agencyId = parseAgencyId(req.params.agencyId)
    const reviewId = Number(req.params.reviewId)
    if (agencyId === null || !Number.isInteger(reviewId)) {
      return res
        .status(400)
        .json({ error: 'Valid agency and review ids are required' })
    }

    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await deleteAgencyReviewStore(agencyId, reviewId, client.id)
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Review not found' })
    }
    if (result.status === 'forbidden') {
      return res
        .status(403)
        .json({ error: 'You can only remove your own review' })
    }

    const reviews = await listAgencyReviewsStore(agencyId)
    return res.status(200).json({
      message: 'Review removed',
      summary: buildAgencyRatingSummary(reviews, agencyId),
    })
  } catch (error) {
    console.error('Error removing agency review:', error)
    return res.status(500).json({ error: 'Failed to remove agency review' })
  }
}
