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
  username: string
  agencyName: string
  createdAt: string
}) => ({
  id: admin.id,
  username: admin.username,
  agencyName: admin.agencyName,
  createdAt: admin.createdAt,
})

export const registerAgencyAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password, agencyName } = req.body as {
      username?: string
      password?: string
      agencyName?: string
    }

    if (!username?.trim() || !password?.trim() || !agencyName?.trim()) {
      return res
        .status(400)
        .json({ error: 'username, password, and agencyName are required' })
    }

    const admin = await registerAgencyAdminStore({
      username: username.trim(),
      password: password.trim(),
      agencyName: agencyName.trim(),
    })
    const session = await createAgencyAdminSessionStore(admin.id)

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

    console.error('Error registering agency admin:', error)
    res.status(500).json({ error: 'Failed to register agency admin' })
  }
}

export const loginAgencyAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as {
      username?: string
      password?: string
    }

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const admin = await authenticateAgencyAdminStore(
      username.trim(),
      password.trim()
    )
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const session = await createAgencyAdminSessionStore(admin.id)
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
