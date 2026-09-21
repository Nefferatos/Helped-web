import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin } from '../auth'
import { hasAgencyRole, type AgencyRole, type LegacyAgencyRole } from '../types/roles'

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

export const requireContractor = async (req: Request, res: Response, next: NextFunction) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })
  if (!hasAgencyRole(admin.role, ['CONTRACTOR', 'contractor', 'SUPER_ADMIN', 'admin'])) return res.status(403).json({ error: 'Contractor access required' })
  next()
}

export const requireAgencyRole = (...roles: Array<AgencyRole | LegacyAgencyRole>) => async (req: Request, res: Response, next: NextFunction) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })
  if (!hasAgencyRole(admin.role, roles)) return res.status(403).json({ error: 'Insufficient role' })
  next()
}
