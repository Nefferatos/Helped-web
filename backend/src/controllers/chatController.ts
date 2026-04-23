import { Request, Response } from 'express'
import {
  getAuthenticatedAgencyAdmin,
  getAuthenticatedClient,
  getRequestAgencyId,
} from '../auth'
import {
  createChatMessageStore,
  getChatConversationsForClientStore,
  getChatConversationsStore,
  getUnreadChatCountForAdminStore,
  getUnreadChatCountForClientStore,
  getChatMessagesForClientStore,
  markChatMessagesReadForAgencyStore,
  markChatMessagesReadForClientStore,
} from '../store'

type ConversationContext = {
  conversationType: 'support' | 'agency'
  agencyId?: number
  agencyName?: string
}

const getConversationContext = (req: Request): ConversationContext => {
  const conversationType: ConversationContext['conversationType'] =
    req.query.type === 'agency' ? 'agency' : 'support'
  const agencyId =
    conversationType === 'agency' ? Number(req.query.agencyId) : undefined
  const agencyName =
    conversationType === 'agency' && typeof req.query.agencyName === 'string'
      ? req.query.agencyName
      : undefined

  return {
    conversationType,
    agencyId: Number.isInteger(agencyId) ? agencyId : undefined,
    agencyName,
  }
}

export const getMyChatMessages = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    const messages = await getChatMessagesForClientStore(
      client.id,
      context.conversationType,
      agencyId
    )
    await markChatMessagesReadForClientStore(
      client.id,
      context.conversationType,
      agencyId
    )
    res.status(200).json({ client, messages })
  } catch (error) {
    console.error('Error fetching client chat messages:', error)
    res.status(500).json({ error: 'Failed to fetch chat messages' })
  }
}

export const getMyChatConversations = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const conversations = await getChatConversationsForClientStore(client.id)
    res.status(200).json({ conversations })
  } catch (error) {
    console.error('Error fetching client chat conversations:', error)
    res.status(500).json({ error: 'Failed to fetch chat conversations' })
  }
}

export const getMyChatSummary = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const unreadCount = await getUnreadChatCountForClientStore(client.id)
    res.status(200).json({ unreadCount })
  } catch (error) {
    console.error('Error fetching client chat summary:', error)
    res.status(500).json({ error: 'Failed to fetch chat summary' })
  }
}

export const sendMyChatMessage = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { message } = req.body as { message?: string }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    const created = await createChatMessageStore({
      clientId: client.id,
      conversationType: context.conversationType,
      agencyId,
      agencyName: context.agencyName,
      senderRole: 'client',
      senderName: client.name,
      message: message.trim(),
    })

    res.status(201).json({ message: created })
  } catch (error) {
    console.error('Error sending client chat message:', error)
    res.status(500).json({ error: 'Failed to send chat message' })
  }
}

export const getAdminChatConversations = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const conversations = await getChatConversationsStore(admin.agencyId)
    res.status(200).json({ conversations })
  } catch (error) {
    console.error('Error fetching admin chat conversations:', error)
    res.status(500).json({ error: 'Failed to fetch chat conversations' })
  }
}

export const getAdminChatSummary = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const unreadCount = await getUnreadChatCountForAdminStore(admin.agencyId)
    res.status(200).json({ unreadCount })
  } catch (error) {
    console.error('Error fetching admin chat summary:', error)
    res.status(500).json({ error: 'Failed to fetch chat summary' })
  }
}

export const getAdminChatMessages = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const clientId = Number(req.params.clientId)
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ error: 'Valid client id is required' })
    }

    const context = getConversationContext(req)
    const agencyId =
      context.conversationType === 'agency'
        ? context.agencyId ?? admin.agencyId
        : admin.agencyId
    const messages = await getChatMessagesForClientStore(
      clientId,
      context.conversationType,
      agencyId
    )
    await markChatMessagesReadForAgencyStore(
      clientId,
      context.conversationType,
      agencyId
    )
    res.status(200).json({ messages })
  } catch (error) {
    console.error('Error fetching admin chat messages:', error)
    res.status(500).json({ error: 'Failed to fetch chat messages' })
  }
}

export const sendAdminChatMessage = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const clientId = Number(req.params.clientId)
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ error: 'Valid client id is required' })
    }

    const { message } = req.body as { message?: string }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const context = getConversationContext(req)
    const agencyId =
      context.conversationType === 'agency'
        ? context.agencyId ?? admin.agencyId
        : admin.agencyId
    const created = await createChatMessageStore({
      clientId,
      conversationType: context.conversationType,
      agencyId,
      agencyName: context.agencyName ?? admin.agencyName,
      senderRole: 'agency',
      senderName:
        context.conversationType === 'agency'
          ? `${context.agencyName ?? admin.agencyName} Team`
          : `${admin.agencyName} Support`,
      message: message.trim(),
    })

    res.status(201).json({ message: created })
  } catch (error) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Client not found' })
    }

    console.error('Error sending admin chat message:', error)
    res.status(500).json({ error: 'Failed to send chat message' })
  }
}
