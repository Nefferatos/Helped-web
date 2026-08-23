import { Request, Response } from 'express'
import {
  getAuthenticatedAgencyAdmin,
  getAuthenticatedClient,
  getRequestAgencyId,
} from '../auth'
import {
  createChatMessageStore,
  getAgencyChatbotConfigStore,
  getChatMessagesAfterIdForAgencyStore,
  getChatMessagesAfterIdForClientStore,
  getChatConversationsForClientStore,
  getChatConversationsStore,
  getLatestChatMessageIdForAgencyStore,
  getLatestChatMessageIdForClientStore,
  getUnreadChatCountForAdminStore,
  getUnreadChatCountForClientStore,
  getChatMessagesForClientStore,
  getSupportNotificationsStore,
  markChatMessagesReadForAgencyStore,
  markChatMessagesReadForClientStore,
  markSupportNotificationsReadForAgencyStore,
  markSupportNotificationsReadForClientStore,
  setPresenceOfflineStore,
  touchPresenceStore,
  updateSupportConversationStore,
  upsertAgencyChatbotConfigStore,
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

const sendSseHeaders = (res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  ;(res as Response & { flushHeaders?: () => void }).flushHeaders?.()
  res.write('retry: 1200\n\n')
}

const writeSseEvent = (res: Response, event: string, data: unknown) => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const writeSseHeartbeat = (res: Response) => {
  res.write(': heartbeat\n\n')
}

const toPositiveAfterId = (value: unknown) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

export const getMyChatMessages = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    const beforeId = toPositiveAfterId(req.query.before) || undefined
    const limit = Math.min(Number(req.query.limit) || 200, 200)
    const messages = await getChatMessagesForClientStore(
      client.id,
      context.conversationType,
      agencyId,
      { before: beforeId, limit }
    )
    try {
      await markChatMessagesReadForClientStore(
        client.id,
        context.conversationType,
        agencyId
      )
    } catch (error) {
      // A read receipt should not stop an employer from seeing loaded messages.
      console.warn('Unable to persist client chat read state:', error)
    }
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
    const notifications = await getSupportNotificationsStore({
      recipientType: 'client',
      clientId: client.id,
      unreadOnly: true,
    })
    res.status(200).json({ unreadCount, notifications })
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

export const clientHeartbeat = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    touchPresenceStore('client', client.id, agencyId)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error recording client presence:', error)
    res.status(500).json({ error: 'Failed to record presence' })
  }
}

export const clientOffline = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    setPresenceOfflineStore('client', client.id)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error clearing client presence:', error)
    res.status(500).json({ error: 'Failed to clear presence' })
  }
}

export const adminHeartbeat = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    touchPresenceStore('admin', admin.id, admin.agencyId)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error recording admin presence:', error)
    res.status(500).json({ error: 'Failed to record presence' })
  }
}

export const adminOffline = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    setPresenceOfflineStore('admin', admin.id)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error clearing admin presence:', error)
    res.status(500).json({ error: 'Failed to clear presence' })
  }
}

export const getMyChatbotConfig = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    const config = await getAgencyChatbotConfigStore(
      agencyId,
      context.agencyName
    )

    res.status(200).json({ config })
  } catch (error) {
    console.error('Error fetching client chatbot config:', error)
    res.status(500).json({ error: 'Failed to fetch chatbot config' })
  }
}

export const postMyChatBotReply = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { message, senderName } = req.body as {
      message?: string
      senderName?: string
    }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const context = getConversationContext(req)
    const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
    const config = await getAgencyChatbotConfigStore(
      agencyId,
      context.agencyName
    )
    const created = await createChatMessageStore({
      clientId: client.id,
      conversationType: context.conversationType,
      agencyId,
      agencyName: context.agencyName,
      senderRole: 'agency',
      senderName: senderName?.trim() || config.botName,
      message: message.trim(),
    })

    res.status(201).json({ message: created })
  } catch (error) {
    console.error('Error sending client chatbot reply:', error)
    res.status(500).json({ error: 'Failed to send chatbot reply' })
  }
}

export const getMyChatLastId = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const lastId = await getLatestChatMessageIdForClientStore(client.id)
    res.status(200).json({ lastId })
  } catch (error) {
    console.error('Error fetching client chat last id:', error)
    res.status(500).json({ error: 'Failed to fetch chat cursor' })
  }
}

export const streamMyChatMessages = async (req: Request, res: Response) => {
  const client = await getAuthenticatedClient(req)
  if (!client) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const context = getConversationContext(req)
  const agencyId = await getRequestAgencyId(req, context.agencyId ?? 1)
  let lastId = toPositiveAfterId(req.query.afterId)
  const includeAll = req.query.all === '1'

  sendSseHeaders(res)

  const poll = async () => {
    try {
      const messages = await getChatMessagesAfterIdForClientStore(client.id, lastId, {
        includeAll,
        conversationType: context.conversationType,
        agencyId,
      })
      for (const message of messages) {
        lastId = Math.max(lastId, message.id)
        writeSseEvent(res, 'message', { message })
      }
    } catch (error) {
      console.error('Error streaming client chat messages:', error)
    }
  }

  const timer = setInterval(() => {
    void poll()
  }, 1200)
  const heartbeatTimer = setInterval(() => {
    writeSseHeartbeat(res)
  }, 15000)

  void poll()

  req.on('close', () => {
    clearInterval(timer)
    clearInterval(heartbeatTimer)
    res.end()
  })
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
    const notifications = await getSupportNotificationsStore({
      recipientType: 'admin',
      agencyId: admin.agencyId,
      unreadOnly: true,
    })
    res.status(200).json({ unreadCount, notifications })
  } catch (error) {
    console.error('Error fetching admin chat summary:', error)
    res.status(500).json({ error: 'Failed to fetch chat summary' })
  }
}

export const markAdminNotificationsRead = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const markedConversationCount = await markSupportNotificationsReadForAgencyStore(
      admin.agencyId
    )
    return res.status(200).json({ ok: true, markedConversationCount })
  } catch (error) {
    console.error('Error marking admin notifications read:', error)
    return res.status(500).json({ error: 'Failed to mark notifications read' })
  }
}

export const markClientNotificationsRead = async (req: Request, res: Response) => {
  try {
    const client = await getAuthenticatedClient(req)
    if (!client) return res.status(401).json({ error: 'Unauthorized' })

    const markedConversationCount = await markSupportNotificationsReadForClientStore(client.id)
    return res.status(200).json({ ok: true, markedConversationCount })
  } catch (error) {
    console.error('Error marking client notifications read:', error)
    return res.status(500).json({ error: 'Failed to mark notifications read' })
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
    const beforeId = toPositiveAfterId(req.query.before) || undefined
    const limit = Math.min(Number(req.query.limit) || 200, 200)
    const messages = await getChatMessagesForClientStore(
      clientId,
      context.conversationType,
      agencyId,
      { before: beforeId, limit }
    )
    try {
      await markChatMessagesReadForAgencyStore(
        clientId,
        context.conversationType,
        agencyId
      )
    } catch (error) {
      console.warn('Unable to persist agency chat read state:', error)
    }
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

export const getAdminChatbotConfig = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const config = await getAgencyChatbotConfigStore(
      admin.agencyId,
      admin.agencyName
    )
    res.status(200).json({ config })
  } catch (error) {
    console.error('Error fetching admin chatbot config:', error)
    res.status(500).json({ error: 'Failed to fetch chatbot config' })
  }
}

export const updateAdminConversationMeta = async (req: Request, res: Response) => {
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
    const body = (req.body ?? {}) as Record<string, unknown>
    const conversation = await updateSupportConversationStore(
      clientId,
      context.conversationType,
      agencyId,
      {
        status:
          typeof body.status === 'string'
            ? (body.status as Parameters<typeof updateSupportConversationStore>[3]['status'])
            : undefined,
        category:
          typeof body.category === 'string'
            ? (body.category as Parameters<typeof updateSupportConversationStore>[3]['category'])
            : undefined,
        priority:
          typeof body.priority === 'string'
            ? (body.priority as Parameters<typeof updateSupportConversationStore>[3]['priority'])
            : undefined,
        assignedAdminId:
          typeof body.assignedAdminId === 'number' ? body.assignedAdminId : admin.id,
        assignedAdminName:
          typeof body.assignedAdminName === 'string'
            ? body.assignedAdminName
            : admin.username || admin.agencyName,
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
      }
    )

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    return res.status(200).json({ conversation })
  } catch (error) {
    console.error('Error updating admin conversation meta:', error)
    return res.status(500).json({ error: 'Failed to update support conversation' })
  }
}

export const updateAdminChatbotConfig = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = (req.body ?? {}) as Record<string, unknown>
    const config = await upsertAgencyChatbotConfigStore(
      admin.agencyId,
      body,
      admin.agencyName
    )

    res.status(200).json({ config })
  } catch (error) {
    console.error('Error saving admin chatbot config:', error)
    res.status(500).json({ error: 'Failed to save chatbot config' })
  }
}

export const getAdminChatLastId = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const lastId = await getLatestChatMessageIdForAgencyStore(admin.agencyId)
    res.status(200).json({ lastId })
  } catch (error) {
    console.error('Error fetching admin chat last id:', error)
    res.status(500).json({ error: 'Failed to fetch chat cursor' })
  }
}

export const streamAdminChatMessages = async (req: Request, res: Response) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let lastId = toPositiveAfterId(req.query.afterId)
  sendSseHeaders(res)

  const poll = async () => {
    try {
      const messages = await getChatMessagesAfterIdForAgencyStore(
        admin.agencyId,
        lastId
      )
      for (const message of messages) {
        lastId = Math.max(lastId, message.id)
        writeSseEvent(res, 'message', { message })
      }
    } catch (error) {
      console.error('Error streaming admin chat messages:', error)
    }
  }

  const timer = setInterval(() => {
    void poll()
  }, 1200)
  const heartbeatTimer = setInterval(() => {
    writeSseHeartbeat(res)
  }, 15000)

  void poll()

  req.on('close', () => {
    clearInterval(timer)
    clearInterval(heartbeatTimer)
    res.end()
  })
}
