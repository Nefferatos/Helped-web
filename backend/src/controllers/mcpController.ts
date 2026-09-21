import type { Request, Response } from 'express'
import { retrieveKnowledgeSnippets } from '../services/vectorService'
import { listWorkflowEventsForEntity } from '../services/eventService'

const tools = [
  { name: 'knowledge_search', description: 'Search agency SOP, FAQ, and MOM knowledge.', inputSchema: { type: 'object', properties: { agencyId: { type: 'number' }, query: { type: 'string' } }, required: ['agencyId', 'query'] } },
  { name: 'workflow_events', description: 'Read the immutable event timeline for an entity.', inputSchema: { type: 'object', properties: { entityType: { type: 'string' }, entityId: { type: 'string' } }, required: ['entityType', 'entityId'] } },
]

const response = (res: Response, id: unknown, result?: unknown, error?: { code: number; message: string }) =>
  res.json(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result })

export const handleMcp = async (req: Request, res: Response) => {
  const secret = process.env.MCP_API_SECRET?.trim()
  const supplied = String(req.headers['x-mcp-secret'] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '')
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'Unauthorized MCP request' })
  const body = req.body as { id?: unknown; method?: string; params?: Record<string, unknown> }
  if (body.method === 'initialize') return response(res, body.id, { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'helped-operator', version: '1.0.0' } })
  if (body.method === 'tools/list') return response(res, body.id, { tools })
  if (body.method !== 'tools/call') return response(res, body.id, undefined, { code: -32601, message: 'Method not found' })
  try {
    const name = String(body.params?.name ?? '')
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>
    if (name === 'knowledge_search') {
      const snippets = await retrieveKnowledgeSnippets(Number(args.agencyId), String(args.query ?? ''))
      return response(res, body.id, { content: [{ type: 'text', text: JSON.stringify(snippets) }] })
    }
    if (name === 'workflow_events') {
      const events = await listWorkflowEventsForEntity(String(args.entityType ?? ''), String(args.entityId ?? ''))
      return response(res, body.id, { content: [{ type: 'text', text: JSON.stringify(events) }] })
    }
    return response(res, body.id, undefined, { code: -32602, message: 'Unknown tool' })
  } catch (error) { return response(res, body.id, undefined, { code: -32603, message: error instanceof Error ? error.message : 'Tool failed' }) }
}
