import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { query, sql } from '../db'
import { getRequestAgencyId } from '../auth'

type MsgLike = { role?: string; content?: string }

/** POST /api/pdf-autofill — proxies PDF extraction to Make webhook, OpenAI, or Anthropic. */
export const pdfAutofill = async (req: Request, res: Response) => {
  const makePdfWebhookUrl = process.env.MAKE_PDF_AUTOFILL_WEBHOOK_URL?.trim()
  const makePdfWebhookToken = process.env.MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN?.trim()
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || process.env.CLINE_API_KEY?.trim()
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim()

  if (!makePdfWebhookUrl && !openaiKey && !anthropicKey) {
    return res.status(503).json({ error: 'PDF autofill is not configured' })
  }

  const { model, messages, templateKey } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages are required' })
  }

  let msgs = messages as MsgLike[]
  if (typeof templateKey === 'string' && templateKey.trim()) {
    try {
      const agencyId = await getRequestAgencyId(req)
      const result = await query(sql`SELECT prompt FROM public.document_templates WHERE agency_id = ${agencyId} AND template_key = ${templateKey.trim()} AND active = TRUE ORDER BY version DESC LIMIT 1`)
      const prompt = String(result.rows?.[0]?.prompt ?? '').trim()
      if (!prompt) return res.status(404).json({ error: 'Document template not found' })
      msgs = [{ role: 'system', content: prompt }, ...msgs]
    } catch (error) { console.error('Template lookup failed:', error); return res.status(500).json({ error: 'Failed to load document template' }) }
  }

  if (makePdfWebhookUrl) {
    try {
      return await handleMakeWebhook(msgs, makePdfWebhookUrl, makePdfWebhookToken, res)
    } catch {
      return res.status(502).json({ error: 'Make PDF autofill is unavailable. Please try again.' })
    }
  }

  if (openaiKey) {
    try {
      return await handleOpenAI(msgs, model, openaiKey, res)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'PDF autofill failed'
      return res.status(500).json({ error: msg })
    }
  }

  try {
    return await handleAnthropic(msgs, anthropicKey!, res)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'PDF autofill failed'
    return res.status(500).json({ error: msg })
  }
}

// --- Make webhook handler ---
async function handleMakeWebhook(
  msgs: MsgLike[],
  webhookUrl: string,
  webhookToken: string | undefined,
  res: Response,
) {
  const systemPrompt = msgs
    .filter((m) => m.role === 'system')
    .map((m) => m.content ?? '')
    .filter(Boolean)
    .join('\n\n')
  const userPrompt = msgs
    .filter((m) => m.role !== 'system')
    .map((m) => m.content ?? '')
    .filter(Boolean)
    .join('\n\n')

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 55_000)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario: 'pdf_autofill',
      requestId: randomUUID(),
      systemPrompt,
      userPrompt,
      ...(webhookToken ? { authToken: webhookToken } : {}),
    }),
    signal: ac.signal,
  })
  clearTimeout(timeout)

  const result = (await response.json()) as {
    content?: unknown
    finish_reason?: unknown
    error?: unknown
  }

  if (!response.ok || typeof result.error === 'string') {
    return res.status(502).json({
      error:
        typeof result.error === 'string'
          ? result.error
          : 'Make PDF autofill failed (' + response.status + ')',
    })
  }

  if (typeof result.content !== 'string' || !result.content.trim()) {
    return res.status(502).json({ error: 'Make PDF autofill returned an empty response' })
  }

  return res.json({
    content: result.content,
    finish_reason: typeof result.finish_reason === 'string' ? result.finish_reason : 'stop',
  })
}

// --- OpenAI-compatible handler ---
async function handleOpenAI(
  msgs: MsgLike[],
  model: string | undefined,
  apiKey: string,
  res: Response,
) {
  const openaiMessages = msgs
    .filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as string, content: m.content ?? '' }))

  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
  const aiModel = process.env.OPENAI_MODEL?.trim() || model || 'gpt-4o'

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 55_000)

  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: aiModel,
      messages: openaiMessages,
      temperature: 0,
      max_tokens: 8192,
    }),
    signal: ac.signal,
  })
  clearTimeout(timeout)

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    error?: { message?: string }
  }

  if (!response.ok || data.error?.message) {
    return res.status(response.ok ? 500 : response.status).json({
      error: data.error?.message || 'OpenAI error ' + response.status,
    })
  }

  return res.json({
    content: data.choices?.[0]?.message?.content || '',
    finish_reason: data.choices?.[0]?.finish_reason || 'stop',
  })
}

// --- Anthropic handler ---
async function handleAnthropic(msgs: MsgLike[], apiKey: string, res: Response) {
  const systemParts = msgs
    .filter((m) => m.role === 'system')
    .map((m) => m.content ?? '')
    .filter(Boolean)
  const nonSystem = msgs.filter((m) => m.role !== 'system') as Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  const sanitized: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const msg of nonSystem) {
    const last = sanitized[sanitized.length - 1]
    if (last?.role === msg.role) {
      last.content += '\n\n' + msg.content
    } else {
      sanitized.push({ role: msg.role, content: msg.content ?? '' })
    }
  }
  if (sanitized.length === 0 || sanitized[0].role === 'assistant') {
    sanitized.unshift({ role: 'user', content: 'Continue.' })
  }

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 55_000)
  const aiModel = process.env.CLAUDE_MODEL?.trim() || 'claude-3-5-haiku-latest'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0,
      max_tokens: 8192,
      ...(systemParts.length > 0 ? { system: systemParts.join('\n\n') } : {}),
      messages: sanitized,
    }),
    signal: ac.signal,
  })
  clearTimeout(timeout)

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>
    stop_reason?: string
    error?: { message?: string }
  }

  if (!response.ok || data.error?.message) {
    return res.status(response.ok ? 500 : response.status).json({
      error: data.error?.message || 'Claude error ' + response.status,
    })
  }

  const textContent = data.content?.find((c) => c.type === 'text')
  return res.json({
    content: textContent?.text || '',
    finish_reason: data.stop_reason || 'unknown',
  })
}
