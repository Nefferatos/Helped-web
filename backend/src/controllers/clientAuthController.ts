import { Request, Response } from 'express'
import { getAuthenticatedClient, getRequestToken } from '../auth'
import {
  authenticateClientStore,
  createClientSessionStore,
  deleteClientSessionStore,
  registerClientStore,
} from '../store'

const toSafeClient = (client: {
  id: number
  name: string
  company?: string
  email: string
  createdAt: string
}) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? '',
  email: client.email,
  createdAt: client.createdAt,
})

export const registerClient = async (req: Request, res: Response) => {
  try {
    const { name, company, email, password } = req.body as {
      name?: string
      company?: string
      email?: string
      password?: string
    }

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ error: 'name, email, and password are required' })
    }

    const client = await registerClientStore({
      name: name.trim(),
      company: company?.trim() || '',
      email: email.trim(),
      password: password.trim(),
    })
    const session = await createClientSessionStore(client.id)

    res.status(201).json({
      token: session.token,
      client: toSafeClient(client),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'CLIENT_EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Client email already exists' })
    }

    console.error('Error registering client:', error)
    res.status(500).json({ error: 'Failed to register client' })
  }
}

export const loginClient = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string
      password?: string
    }

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const client = await authenticateClientStore(email.trim(), password.trim())
    if (!client) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const session = await createClientSessionStore(client.id)
    res.status(200).json({
      token: session.token,
      client: toSafeClient(client),
    })
  } catch (error) {
    console.error('Error logging in client:', error)
    res.status(500).json({ error: 'Failed to login client' })
  }
}

export const getClientMe = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    res.status(200).json({ client: toSafeClient(client) })
  } catch (error) {
    console.error('Error fetching client profile:', error)
    res.status(500).json({ error: 'Failed to fetch client profile' })
  }
}

export const logoutClient = async (req: Request, res: Response) => {
  try {
    const token = getRequestToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    await deleteClientSessionStore(token)
    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Error logging out client:', error)
    res.status(500).json({ error: 'Failed to logout client' })
  }
}
