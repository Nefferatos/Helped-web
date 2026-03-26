import { Request } from 'express'
import { ClientRecord, getClientByTokenStore } from './store'

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export const getAuthenticatedClient = async (
  req: Request
): Promise<ClientRecord | null> => {
  const token = getBearerToken(req)
  if (!token) {
    return null
  }

  return getClientByTokenStore(token)
}

export const getRequestToken = (req: Request) => getBearerToken(req)
