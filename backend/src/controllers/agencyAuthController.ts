import { Request, Response } from 'express'
import { getAuthenticatedAgencyAdmin, getRequestToken } from '../auth'
import {
  authenticateAgencyAdminStore,
  createAgencyAdminSessionStore,
  deleteAgencyAdminSessionStore,
  registerAgencyAdminStore,
} from '../store'

const toSafeAgencyAdmin = (admin: {
  id: number
  agencyId: number
  username: string
  email?: string
  role?: 'admin' | 'staff'
  agencyName: string
  profileImageUrl?: string
  createdAt: string
}) => ({
  id: admin.id,
  agencyId: admin.agencyId,
  username: admin.username,
  email: admin.email ?? '',
  role: admin.role ?? 'admin',
  agencyName: admin.agencyName,
  profileImageUrl: admin.profileImageUrl ?? '',
  createdAt: admin.createdAt,
})

export const registerAgencyAdmin = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? null) as {
      username?: unknown
      email?: unknown
      password?: unknown
      agencyName?: unknown
    } | null
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const username = typeof body.username === 'string' ? body.username : ''
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const agencyName = typeof body.agencyName === 'string' ? body.agencyName : ''

    if (!username.trim() || !password.trim() || !agencyName.trim()) {
      return res
        .status(400)
        .json({ error: 'username, password, and agencyName are required' })
    }

    const admin = await registerAgencyAdminStore({
      username: username.trim(),
      email: email.trim() || undefined,
      password: password.trim(),
      agencyName: agencyName.trim(),
    })
    const session = await createAgencyAdminSessionStore(admin.id)
    console.log('LOGIN:', admin.id, session.token)

    res.status(201).json({
      token: session.token,
      admin: toSafeAgencyAdmin(admin),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'AGENCY_ADMIN_USERNAME_EXISTS'
    ) {
      return res.status(409).json({ error: 'Agency admin username already exists' })
    }
    if (error instanceof Error && error.message === 'AGENCY_ADMIN_EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Agency admin email already exists' })
    }

    console.error('Error registering agency admin:', error)
    res.status(500).json({ error: 'Failed to register agency admin' })
  }
}

export const loginAgencyAdmin = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? null) as { username?: unknown; password?: unknown } | null
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const username = typeof body.username === 'string' ? body.username : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!username.trim() || !password.trim()) {
      return res.status(400).json({ error: 'username/email and password are required' })
    }

    const admin = await authenticateAgencyAdminStore(
      username.trim(),
      password.trim()
    )
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const session = await createAgencyAdminSessionStore(admin.id)
    console.log('LOGIN:', admin.id, session.token)
    res.status(200).json({
      token: session.token,
      admin: toSafeAgencyAdmin(admin),
    })
  } catch (error) {
    console.error('Error logging in agency admin:', error)
    res.status(500).json({ error: 'Failed to login agency admin' })
  }
}

export const getAgencyAdminMe = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    res.status(200).json({ admin: toSafeAgencyAdmin(admin) })
  } catch (error) {
    console.error('Error fetching agency admin profile:', error)
    res.status(500).json({ error: 'Failed to fetch agency admin profile' })
  }
}

export const logoutAgencyAdmin = async (req: Request, res: Response) => {
  try {
    const token = getRequestToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await deleteAgencyAdminSessionStore(token)
    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Error logging out agency admin:', error)
    res.status(500).json({ error: 'Failed to logout agency admin' })
  }
}

export const createAgencyAdminForAgency = async (req: Request, res: Response) => {
  try {
    const currentAdmin = await getAuthenticatedAgencyAdmin(req)
    if (!currentAdmin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = (req.body ?? null) as {
      email?: unknown
      username?: unknown
      password?: unknown
      role?: unknown
    } | null
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const username =
      typeof body.username === 'string' ? body.username.trim() : email.split('@')[0] || ''
    const password = typeof body.password === 'string' ? body.password.trim() : ''
    const role = body.role === 'staff' ? 'staff' : 'admin'

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const admin = await registerAgencyAdminStore({
      agencyId: currentAdmin.agencyId,
      agencyName: currentAdmin.agencyName,
      username,
      email,
      password,
      role,
    })

    res.status(201).json({ admin: toSafeAgencyAdmin(admin) })
  } catch (error) {
    if (error instanceof Error && error.message === 'AGENCY_ADMIN_EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Agency admin email already exists' })
    }
    if (error instanceof Error && error.message === 'AGENCY_ADMIN_USERNAME_EXISTS') {
      return res.status(409).json({ error: 'Agency admin username already exists' })
    }

    console.error('Error creating agency admin:', error)
    res.status(500).json({ error: 'Failed to create agency admin' })
  }
}
