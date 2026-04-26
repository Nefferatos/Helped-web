import { Request, Response } from 'express'
import {
  getAuthenticatedAgencyAdmin,
  getAuthenticatedClient,
} from '../auth'
import {
  createMessageRecord,
  getConversationById,
  getConversationByRequestId,
  getMessagesByConversationId,
  getRequestRecordById,
} from '../repositories/requestRepository'

const getAuthorizedRequestConversation = async (req: Request, requestId: string) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  const client = admin ? null : await getAuthenticatedClient(req)
  const requestRecord = await getRequestRecordById(requestId)

  if (!requestRecord) {
    return { admin, client, requestRecord: null, conversation: null, error: 'Request not found' as const }
  }

  if (admin && requestRecord.agencyId !== admin.agencyId) {
    return { admin, client, requestRecord: null, conversation: null, error: 'Request not found' as const }
  }
  if (!admin && client?.id !== requestRecord.clientId) {
    return { admin, client, requestRecord: null, conversation: null, error: 'Request not found' as const }
  }

  const conversation = await getConversationByRequestId(requestRecord.id)
  if (!conversation) {
    return {
      admin,
      client,
      requestRecord,
      conversation: null,
      error: 'Conversation not found' as const,
    }
  }

  return { admin, client, requestRecord, conversation, error: null }
}

const getAuthorizedConversationById = async (req: Request, conversationId: string) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  const client = admin ? null : await getAuthenticatedClient(req)
  const conversation = await getConversationById(conversationId)

  if (!conversation) {
    return { admin, client, conversation: null, error: 'Conversation not found' as const }
  }

  const requestRecord = await getRequestRecordById(conversation.requestId)
  if (!requestRecord) {
    return { admin, client, conversation: null, error: 'Conversation not found' as const }
  }

  if (admin) {
    if (requestRecord.agencyId !== admin.agencyId) {
      return { admin, client, conversation: null, error: 'Conversation not found' as const }
    }
  } else if (client?.id !== requestRecord.clientId) {
    return { admin, client, conversation: null, error: 'Conversation not found' as const }
  }

  return { admin, client, conversation, requestRecord, error: null }
}

export const getRequestConversation = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const client = admin ? null : await getAuthenticatedClient(req)
    if (!admin && !client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const requestId = String(req.params.requestId ?? '').trim()
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' })
    }

    const result = await getAuthorizedRequestConversation(req, requestId)
    if (result.error || !result.conversation) {
      return res.status(404).json({ error: result.error ?? 'Conversation not found' })
    }

    return res.status(200).json({ data: result.conversation })
  } catch (error) {
    console.error('Error fetching request conversation:', error)
    return res.status(500).json({ error: 'Failed to fetch conversation' })
  }
}

export const getRequestMessages = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const client = admin ? null : await getAuthenticatedClient(req)
    if (!admin && !client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const conversationId = String(req.params.conversationId ?? '').trim()
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' })
    }

    const result = await getAuthorizedConversationById(req, conversationId)
    if (result.error || !result.conversation) {
      return res.status(404).json({ error: result.error ?? 'Conversation not found' })
    }

    const messages = await getMessagesByConversationId(result.conversation.id)
    return res.status(200).json({ data: messages })
  } catch (error) {
    console.error('Error fetching request messages:', error)
    return res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

export const postRequestMessage = async (req: Request, res: Response) => {
  try {
    const admin = await getAuthenticatedAgencyAdmin(req)
    const client = admin ? null : await getAuthenticatedClient(req)

    if (!admin && !client) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = (req.body ?? {}) as {
      conversationId?: string
      message?: string
      attachments?: unknown
    }

    const conversationId = String(body.conversationId ?? '').trim()
    const message = String(body.message ?? '').trim()

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' })
    }
    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    const result = await getAuthorizedConversationById(req, conversationId)
    if (result.error || !result.conversation) {
      return res.status(404).json({ error: result.error ?? 'Conversation not found' })
    }

    const created = await createMessageRecord({
      conversationId: result.conversation.id,
      senderType: client ? 'client' : admin?.role === 'staff' ? 'staff' : 'admin',
      senderId: client?.id ?? admin?.id ?? 0,
      message,
      ...(body.attachments !== undefined ? { attachments: body.attachments } : {}),
    })

    return res.status(201).json({ data: created })
  } catch (error) {
    console.error('Error creating request message:', error)
    return res.status(500).json({ error: 'Failed to send message' })
  }
}
