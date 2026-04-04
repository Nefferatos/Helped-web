import { Request, Response } from 'express'
import { getAuthenticatedClient, getRequestToken } from '../auth'
import {
  authenticateClientStore,
  createClientSessionStore,
  deleteClientSessionStore,
  registerClientStore,
  updateClientStore,
} from '../store'

const toSafeClient = (client: {
  id: number
  name: string
  company?: string
  phone?: string
  email: string
  profileImageUrl?: string
  createdAt: string
}) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? '',
  phone: client.phone ?? '',
  email: client.email,
  profileImageUrl: client.profileImageUrl ?? '',
  createdAt: client.createdAt,
})

export const registerClient = async (req: Request, res: Response) => {
  try {
    const { name, company, phone, email, password } = req.body as {
      name?: string
      company?: string
      phone?: string
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
      phone: phone?.trim() || '',
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

export const updateClientMe = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, company, phone, email, profileImageUrl } = req.body as {
      name?: string
      company?: string
      phone?: string
      email?: string
      profileImageUrl?: string
    }

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' })
    }

    const updated = await updateClientStore(client.id, {
      name,
      company,
      phone,
      email,
      profileImageUrl,
    })

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' })
    }

    res.status(200).json({ client: toSafeClient(updated) })
  } catch (error) {
    if (error instanceof Error && error.message === 'CLIENT_EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Client email already exists' })
    }

    console.error('Error updating client profile:', error)
    res.status(500).json({ error: 'Failed to update client profile' })
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
