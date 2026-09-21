import { callMakeAiEngine, type MakeAiEngineScenario } from './makeAiEngine'

export type AiGatewayTask = 'chat' | 'extractDocument' | 'translate' | 'matchCandidates'
export type AiGatewayProvider = 'make' | 'anthropic' | 'gemini' | 'openai-compatible'

export interface AiGatewayRequest {
  task: AiGatewayTask
  systemPrompt: string
  userPrompt: string
  scenario?: MakeAiEngineScenario
  json?: boolean
  maxTokens?: number
}

export interface AiGatewayResponse<T = unknown> {
  provider: AiGatewayProvider
  text: string
  data: T | null
}

const firstDefinedEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return ''
}

const parseJson = <T>(value: string): T | null => {
  const first = value.indexOf('{')
  const last = value.lastIndexOf('}')
  if (first < 0 || last <= first) return null
  try { return JSON.parse(value.slice(first, last + 1)) as T } catch { return null }
}

const callAnthropic = async (request: AiGatewayRequest): Promise<AiGatewayResponse | null> => {
  const apiKey = firstDefinedEnv('ANTHROPIC_API_KEY', 'CLAUDE_API_KEY')
  if (!apiKey) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: firstDefinedEnv('ANTHROPIC_MODEL', 'CLAUDE_MODEL') || 'claude-3-5-haiku-latest',
        max_tokens: request.maxTokens ?? 1024, temperature: 0.2,
        system: `${request.systemPrompt}${request.json ? ' Return only valid JSON.' : ''}`,
        messages: [{ role: 'user', content: request.userPrompt }],
      }), signal: controller.signal,
    })
    if (!response.ok) return null
    const body = await response.json() as { content?: Array<{ type?: string; text?: string }> }
    const text = body.content?.filter((part) => part.type === 'text').map((part) => part.text ?? '').join('\n') ?? ''
    return { provider: 'anthropic', text, data: request.json ? parseJson(text) : null }
  } catch { return null } finally { clearTimeout(timeout) }
}

const callGemini = async (request: AiGatewayRequest): Promise<AiGatewayResponse | null> => {
  const apiKey = firstDefinedEnv('GEMINI_API_KEY', 'GOOGLE_API_KEY')
  if (!apiKey) return null
  const model = firstDefinedEnv('GEMINI_MODEL', 'GOOGLE_MODEL') || 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${request.systemPrompt}${request.json ? '\n\nReturn only valid JSON.' : ''}\n\n${request.userPrompt}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: request.maxTokens ?? 1024, ...(request.json ? { responseMimeType: 'application/json' } : {}) },
      }), signal: controller.signal,
    })
    if (!response.ok) return null
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? ''
    return { provider: 'gemini', text, data: request.json ? parseJson(text) : null }
  } catch { return null } finally { clearTimeout(timeout) }
}

const callOpenAiCompatible = async (request: AiGatewayRequest): Promise<AiGatewayResponse | null> => {
  const apiKey = firstDefinedEnv('OPENAI_API_KEY', 'CLINE_API_KEY')
  if (!apiKey) return null
  const baseUrl = firstDefinedEnv('OPENAI_BASE_URL', 'CLINE_API_URL') || 'https://api.openai.com/v1'
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: firstDefinedEnv('OPENAI_MODEL', 'CLINE_MODEL') || 'gpt-4o-mini', temperature: 0.2,
        ...(request.json ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: request.systemPrompt }, { role: 'user', content: request.userPrompt }],
      }),
    })
    if (!response.ok) return null
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = body.choices?.[0]?.message?.content ?? ''
    return { provider: 'openai-compatible', text, data: request.json ? parseJson(text) : null }
  } catch { return null }
}

const chat = async <T = unknown>(request: AiGatewayRequest): Promise<AiGatewayResponse<T> | null> => {
  const make = await callMakeAiEngine({ scenario: request.scenario ?? 'workflow', systemPrompt: request.systemPrompt, userPrompt: request.userPrompt }).catch(() => null)
  if (make?.json) return { provider: 'make', text: make.text ?? JSON.stringify(make.json), data: make.json as T }
  if (make?.text) {
    const data = request.json ? parseJson<T>(make.text) : null
    if (!request.json || data) return { provider: 'make', text: make.text, data }
  }
  for (const caller of [callAnthropic, callGemini, callOpenAiCompatible]) {
    const result = await caller(request)
    if (result && (!request.json || result.data)) return result as AiGatewayResponse<T>
  }
  return null
}

export const ai = {
  chat,
  chatJson: <T>(request: Omit<AiGatewayRequest, 'task' | 'json'>) => chat<T>({ ...request, task: 'chat', json: true }),
  extractDocument: (request: Omit<AiGatewayRequest, 'task'>) => chat({ ...request, task: 'extractDocument' }),
  translate: (request: Omit<AiGatewayRequest, 'task'>) => chat({ ...request, task: 'translate' }),
  matchCandidates: <T>(request: Omit<AiGatewayRequest, 'task' | 'json'>) => chat<T>({ ...request, task: 'matchCandidates', json: true }),
}
