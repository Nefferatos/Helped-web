import { Request, Response } from 'express'
import { getRequestAgencyId, getAuthenticatedAgencyAdmin } from '../auth'
import {
  createWhatsAppBroadcast,
  getWhatsAppConversationBundle,
  getWhatsAppDashboardMetrics,
  listWhatsAppConversations,
  listWhatsAppTemplates,
  receiveWhatsAppInbound,
  sendWhatsAppMessage,
  updateWhatsAppConversationStage,
  upsertWhatsAppTemplate,
  type WhatsAppAttachmentKind,
  type WhatsAppTemplateCategory,
} from '../whatsappStore'

const requireActorName = async (req: Request) => {
  const admin = await getAuthenticatedAgencyAdmin(req)
  return admin?.username?.trim() || admin?.email?.trim() || 'Agency Recruiter'
}

export const getWhatsAppCandidateConversation = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const referenceCode = String(req.params.referenceCode ?? '').trim()
    if (!referenceCode) {
      return res.status(400).json({ error: 'Candidate reference code is required' })
    }

    const bundle = await getWhatsAppConversationBundle(agencyId, referenceCode)
    res.status(200).json(bundle)
  } catch (error) {
    if (error instanceof Error && error.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ error: 'Candidate not found' })
    }
    console.error('Error fetching WhatsApp conversation:', error)
    res.status(500).json({ error: 'Failed to fetch WhatsApp conversation' })
  }
}

export const postWhatsAppCandidateMessage = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const actorName = await requireActorName(req)
    const referenceCode = String(req.params.referenceCode ?? '').trim()
    const {
      text,
      templateKey,
      templateVariables,
      attachments,
      automated,
    } = req.body as {
      text?: string
      templateKey?: string
      templateVariables?: Record<string, string | undefined>
      attachments?: Array<{
        fileName: string
        mimeType: string
        dataBase64: string
        kind: WhatsAppAttachmentKind
      }>
      automated?: boolean
    }

    const bundle = await sendWhatsAppMessage({
      agencyId,
      candidateReferenceCode: referenceCode,
      senderName: actorName,
      text,
      templateKey,
      templateVariables,
      attachments,
      automated,
    })
    res.status(201).json(bundle)
  } catch (error) {
    if (error instanceof Error && error.message === 'MESSAGE_REQUIRED') {
      return res.status(400).json({ error: 'Message text, template, or attachment is required' })
    }
    if (error instanceof Error && error.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ error: 'Candidate not found' })
    }
    console.error('Error sending WhatsApp message:', error)
    res.status(500).json({ error: 'Failed to send WhatsApp message' })
  }
}

export const postWhatsAppInbound = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const {
      candidateReferenceCode,
      applicantName,
      text,
      attachments,
      enableAiReply,
    } = req.body as {
      candidateReferenceCode?: string
      applicantName?: string
      text?: string
      attachments?: Array<{
        fileName: string
        mimeType: string
        dataBase64: string
        kind: WhatsAppAttachmentKind
      }>
      enableAiReply?: boolean
    }

    if (!candidateReferenceCode?.trim()) {
      return res.status(400).json({ error: 'candidateReferenceCode is required' })
    }

    const bundle = await receiveWhatsAppInbound({
      agencyId,
      candidateReferenceCode: candidateReferenceCode.trim(),
      applicantName,
      text,
      attachments,
      enableAiReply,
    })
    res.status(201).json(bundle)
  } catch (error) {
    if (error instanceof Error && error.message === 'MESSAGE_REQUIRED') {
      return res.status(400).json({ error: 'Inbound message text or attachment is required' })
    }
    if (error instanceof Error && error.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ error: 'Candidate not found' })
    }
    console.error('Error receiving WhatsApp inbound message:', error)
    res.status(500).json({ error: 'Failed to receive WhatsApp inbound message' })
  }
}

export const patchWhatsAppCandidateStage = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const actorName = await requireActorName(req)
    const referenceCode = String(req.params.referenceCode ?? '').trim()
    const {
      stage,
      nextStep,
      interviewSchedule,
      sendWorkflowTemplate,
    } = req.body as {
      stage?: string
      nextStep?: string
      interviewSchedule?: {
        date: string
        time: string
        status: 'scheduled' | 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed'
      }
      sendWorkflowTemplate?: boolean
    }

    if (!stage?.trim()) {
      return res.status(400).json({ error: 'stage is required' })
    }

    const bundle = await updateWhatsAppConversationStage({
      agencyId,
      candidateReferenceCode: referenceCode,
      stage,
      nextStep,
      interviewSchedule,
      sendWorkflowTemplate,
      actorName,
    })
    res.status(200).json(bundle)
  } catch (error) {
    console.error('Error updating WhatsApp candidate stage:', error)
    res.status(500).json({ error: 'Failed to update WhatsApp recruitment stage' })
  }
}

export const getWhatsAppMetrics = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const metrics = await getWhatsAppDashboardMetrics(agencyId)
    res.status(200).json(metrics)
  } catch (error) {
    console.error('Error fetching WhatsApp dashboard metrics:', error)
    res.status(500).json({ error: 'Failed to fetch WhatsApp dashboard metrics' })
  }
}

export const getWhatsAppConversations = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const conversations = await listWhatsAppConversations(agencyId, {
      stage: typeof req.query.stage === 'string' ? req.query.stage : undefined,
      tag: typeof req.query.tag === 'string' ? req.query.tag : undefined,
      query: typeof req.query.q === 'string' ? req.query.q : undefined,
    })
    res.status(200).json({ conversations })
  } catch (error) {
    console.error('Error listing WhatsApp conversations:', error)
    res.status(500).json({ error: 'Failed to list WhatsApp conversations' })
  }
}

export const getWhatsAppTemplates = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const templates = await listWhatsAppTemplates(agencyId)
    res.status(200).json({ templates })
  } catch (error) {
    console.error('Error listing WhatsApp templates:', error)
    res.status(500).json({ error: 'Failed to list WhatsApp templates' })
  }
}

export const putWhatsAppTemplate = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const {
      id,
      key,
      name,
      category,
      language,
      body,
      variables,
      active,
    } = req.body as {
      id?: string
      key?: string
      name?: string
      category?: WhatsAppTemplateCategory
      language?: string
      body?: string
      variables?: string[]
      active?: boolean
    }

    if (!key?.trim() || !name?.trim() || !category || !body?.trim()) {
      return res.status(400).json({ error: 'key, name, category, and body are required' })
    }

    const template = await upsertWhatsAppTemplate({
      agencyId,
      id,
      key,
      name,
      category,
      language,
      body,
      variables,
      active,
    })
    res.status(200).json({ template })
  } catch (error) {
    console.error('Error saving WhatsApp template:', error)
    res.status(500).json({ error: 'Failed to save WhatsApp template' })
  }
}

export const postWhatsAppBroadcast = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req)
    const actorName = await requireActorName(req)
    const { name, candidateReferenceCodes, text, templateKey } = req.body as {
      name?: string
      candidateReferenceCodes?: string[]
      text?: string
      templateKey?: string
    }

    if (!name?.trim() || !Array.isArray(candidateReferenceCodes) || candidateReferenceCodes.length === 0) {
      return res.status(400).json({ error: 'name and candidateReferenceCodes are required' })
    }

    const broadcast = await createWhatsAppBroadcast({
      agencyId,
      createdBy: actorName,
      name,
      candidateReferenceCodes,
      text,
      templateKey,
    })
    res.status(201).json({ broadcast })
  } catch (error) {
    console.error('Error sending WhatsApp broadcast:', error)
    res.status(500).json({ error: 'Failed to send WhatsApp broadcast' })
  }
}
