import { createWorkflowMakeDeliveryStore } from '../store/workflowStore'

const timeoutMs = 8000

const scenarioToEnvKey = (scenario: string) =>
  `MAKE_WEBHOOK_URL_${scenario
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`

const resolveMakeUrl = (scenario: string, explicitUrl?: string) => {
  const scenarioKey = scenarioToEnvKey(scenario)
  return (
    explicitUrl?.trim() ||
    process.env[scenarioKey]?.trim() ||
    process.env.MAKE_WEBHOOK_URL?.trim() ||
    ''
  )
}

const parseTextResponse = async (response: Response) => {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

export const sendToMakeWebhook = async (payload: {
  scenario: string
  payload: Record<string, unknown>
  url?: string
}) => {
  const url = resolveMakeUrl(payload.scenario, payload.url)

  if (!url) {
    const record = await createWorkflowMakeDeliveryStore({
      scenario: payload.scenario,
      url: '',
      payload: payload.payload,
      success: false,
      statusCode: null,
      durationMs: 0,
      responseBody: '',
      error: `No Make webhook configured. Checked ${scenarioToEnvKey(
        payload.scenario
      )} and MAKE_WEBHOOK_URL`,
    })

    return {
      delivery: record,
      ok: false,
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.payload),
      signal: controller.signal,
    })
    const responseBody = await parseTextResponse(response)
    const record = await createWorkflowMakeDeliveryStore({
      scenario: payload.scenario,
      url,
      payload: payload.payload,
      success: response.ok,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responseBody,
      error: response.ok ? '' : `HTTP ${response.status}`,
    })

    return {
      delivery: record,
      ok: response.ok,
    }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Make webhook timed out after ${timeoutMs}ms`
        : error instanceof Error
        ? error.message
        : 'Unknown Make webhook error'

    const record = await createWorkflowMakeDeliveryStore({
      scenario: payload.scenario,
      url,
      payload: payload.payload,
      success: false,
      statusCode: null,
      durationMs: Date.now() - startedAt,
      responseBody: '',
      error: message,
    })

    return {
      delivery: record,
      ok: false,
    }
  } finally {
    clearTimeout(timer)
  }
}
