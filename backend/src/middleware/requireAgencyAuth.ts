import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin } from '../auth'

export const requireAgencyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
