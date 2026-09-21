import type { Request, Response } from 'express'
import { getRequestAgencyId } from '../auth'
import { indexKnowledgeDocument, retrieveKnowledgeSnippets } from '../services/vectorService'

export const indexKnowledge = async (req: Request, res: Response) => {
  try {
    const { sourceKey, title, category, content, metadata } = req.body as Record<string, unknown>
    if (typeof sourceKey !== 'string' || typeof title !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'sourceKey, title, and content are required' })
    }
    if (category !== 'SOP' && category !== 'FAQ' && category !== 'MOM') {
      return res.status(400).json({ error: 'category must be SOP, FAQ, or MOM' })
    }
    const documentId = await indexKnowledgeDocument({
      agencyId: await getRequestAgencyId(req), sourceKey: sourceKey.trim(), title: title.trim(), category,
      content: content.trim(), metadata: metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {},
    })
    return res.status(201).json({ documentId })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to index knowledge' })
  }
}

export const searchKnowledge = async (req: Request, res: Response) => {
  try {
    const text = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (!text) return res.status(400).json({ error: 'q is required' })
    const snippets = await retrieveKnowledgeSnippets(await getRequestAgencyId(req), text)
    return res.status(200).json({ snippets })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to search knowledge' })
  }
}
