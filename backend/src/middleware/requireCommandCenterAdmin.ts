import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin } from '../auth'
import { createRateLimit } from './rateLimit'
import { isAgencyAdministrator } from '../types/roles'

/**
 * Protects administrative Command Center routes and scopes them to the
 * authenticated agency session. This is an admin access gate, not the owner
 * approval check; sensitive approval handlers must separately verify the
 * configured owner identity and exact approved payload hash.
 */
export const requireCommandCenterAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) return res.status(401).json({ error: 'Unauthorized' })
    if (!isAgencyAdministrator(admin.role)) {
      return res.status(403).json({ error: 'Command Center administrator access required' })
    }

    // Never accept agency scope from request parameters or body fields.
    req.admin = admin
    req.agencyId = admin.agencyId
    return next()
  } catch {
    return res.status(503).json({ error: 'Command Center authorization is unavailable' })
  }
}

export const commandCenterRateLimit = createRateLimit({
  keyPrefix: 'ai-command-center',
  maxRequests: 30,
  windowMs: 60_000,
})
