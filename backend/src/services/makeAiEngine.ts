import { sendToMakeWebhook } from './workflowMakeService'

/**
 * Make.com AI Engine gateway.
 *
 * Every AI tool in the backend should route its LLM call through this gateway
 * so Make.com is the single AI engine. Direct Claude/Groq/Gemini/OpenAI calls
 * remain only as fallback when Make.com is not configured or fails.
 */

export type MakeAiEngineScenario =
  | 'receptionist'
  | 'workflow'
  | 'marketing'
  | 'pdf-autofill'
  | 'hr-interviewer'

export interface MakeAiEngineInput {
  scenario: MakeAiEngineScenario
  systemPrompt: string
  userPrompt: string
  /** Extra structured context passed through to the Make scenario. */
  context?: Record<string, unknown>
}

export interface MakeAiEngineResult {
  /** Raw text returned by Make.com (or the AI's content wrapping). */
  text: string
  /** Parsed JSON object if the response was JSON, otherwise null. */
  json: Record<string, unknown> | null
  ok: boolean
  makeExecutionId: string | null
}

const extractJsonObject = (value: string): Record<string, unknown> | null => {
  const firstBrace = value.indexOf('{')
  const lastBrace = value.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
  try {
    return JSON.parse(value.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

const stripCodeFences = (value: string) =>
  value
    .trim()
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/`/g, '')
    .trim()

/**
 * Normalise a Make.com webhook response into text.
 * Make scenarios may return:
 *   - raw text
 *   - JSON like { "text": "...", "response": "..." }
 *   - JSON like { "message": { "text": "..." } }
 */
const extractText = (responseBody: string): string => {
  const cleaned = stripCodeFences(responseBody)
  const parsed = extractJsonObject(cleaned)
  if (!parsed) return cleaned

  // Pull the most likely text field.
  const candidate =
    (parsed.text as string | undefined) ??
    (parsed.response as string | undefined) ??
    ((parsed.message as Record<string, unknown> | undefined)?.text as string | undefined) ??
    ((parsed.message as Record<string, unknown> | undefined)?.content as string | undefined)

  if (typeof candidate === 'string' && candidate.trim()) return candidate

  // If the JSON has an action/message but no direct text, return the whole object stringified.
  return JSON.stringify(parsed)
}

/**
 * Send an AI request through Make.com and return the normalised result.
 * Returns null when Make.com is not configured or the call fails — callers
 * should then fall back to their existing direct-LLM path.
 */
export const callMakeAiEngine = async (
  input: MakeAiEngineInput,
): Promise<MakeAiEngineResult | null> => {
  const scenarioKey = `ai-engine-${input.scenario}`

  const result = await sendToMakeWebhook({
    scenario: scenarioKey,
    payload: {
      type: 'ai_engine',
      scenario: input.scenario,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      context: input.context ?? {},
    },
  })

  if (!result.ok || !result.delivery) return null

  const responseBody = result.delivery.responseBody ?? ''
  if (!responseBody.trim()) return null

  const text = extractText(responseBody)
  return {
    text,
    json: extractJsonObject(stripCodeFences(responseBody)),
    ok: true,
    makeExecutionId: String(result.delivery.id ?? ''),
  }
}
