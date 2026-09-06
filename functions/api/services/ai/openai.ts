/**
 * OpenAI-compatible AI provider.
 *
 * Works with any OpenAI-compatible API endpoint:
 * - OpenAI (https://api.openai.com/v1/chat/completions)
 * - Cline (https://api.cline.ai/v1/chat/completions)
 * - OpenRouter (https://openrouter.ai/api/v1/chat/completions)
 * - Local LLMs (http://localhost:11434/v1/chat/completions)
 *
 * Env vars:
 *   OPENAI_API_KEY   – Bearer token for the API
 *   OPENAI_BASE_URL  – Base URL (default: https://api.openai.com/v1)
 *   OPENAI_MODEL     – Default model name (default: gpt-4o)
 */

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIChatOptions = {
  apiKey: string;
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
  retries?: number;
  signal?: AbortSignal;
  baseUrl?: string;
};

type OpenAIChatResponse = {
  id?: string;
  data?: {
    choices?: { message?: { role?: string; content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  choices?: { message?: { role?: string; content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const rateLimitBuckets = new Map<string, number[]>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const assertAiRateLimit = (key: string, limit = 30, windowMs = 60_000) => {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) throw new Error("AI rate limit exceeded. Please try again in a minute.");
  recent.push(now);
  rateLimitBuckets.set(key, recent);
};

const parseJson = <T,>(text: string): T | null => {
  if (!text.trim()) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
};

const readError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  const body = parseJson<{ error?: { message?: string } }>(text);
  return body?.error?.message || text.trim() || response.statusText || "No response body";
};

/**
 * Send a chat completion request to an OpenAI-compatible API.
 * Returns the assistant's text response.
 */
export const openaiChat = async (options: OpenAIChatOptions) => {
  const retries = options.retries ?? 2;
  let lastError: Error | null = null;
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;

  const systemMessages = options.messages.filter((m) => m.role === "system");
  const nonSystemMessages = options.messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[];

  const systemContent = systemMessages.map((m) => m.content).join("\n\n");
  const finalMessages: OpenAIMessage[] = [];
  if (systemContent) {
    finalMessages.push({ role: "system", content: systemContent });
  }
  finalMessages.push(...nonSystemMessages);

  if (options.responseFormat === "json_object" && finalMessages[0]?.role === "system") {
    finalMessages[0] = {
      role: "system",
      content: `${finalMessages[0].content}\n\nYou MUST respond with valid JSON only, no other text.`,
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: options.signal,
        headers: {
          "Authorization": `Bearer ${options.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          messages: finalMessages,
          temperature: options.temperature ?? 0.25,
          max_tokens: options.maxTokens ?? 1000,
          ...(options.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (!response.ok) {
        const message = await readError(response);
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`AI request failed (${response.status}): ${message}`);
      }

      const text = await response.text();
      const data = parseJson<OpenAIChatResponse>(text);

      if (!data) {
        throw new Error(
          text.trim()
            ? `AI returned a non-JSON response: ${text.trim().slice(0, 200)}`
            : "AI returned an empty response.",
        );
      }

      // Handle Cline API's {data: {...}, success: true} wrapper
      const inner = data.data ?? data;
      const content = inner.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("AI returned an empty message.");
      }

      return {
        id: data.id ?? "",
        content,
        usage: inner.usage ?? {},
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI request failed");
      if (attempt < retries) {
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error("AI request failed");
};

/**
 * Stream a chat completion response using OpenAI-compatible SSE format.
 */
export const openaiChatStream = async (options: OpenAIChatOptions) => {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;

  const systemMessages = options.messages.filter((m) => m.role === "system");
  const nonSystemMessages = options.messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[];

  const systemContent = systemMessages.map((m) => m.content).join("\n\n");
  const finalMessages: OpenAIMessage[] = [];
  if (systemContent) {
    finalMessages.push({ role: "system", content: systemContent });
  }
  finalMessages.push(...nonSystemMessages);

  const response = await fetch(url, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Authorization": `Bearer ${options.apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: finalMessages,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI stream failed (${response.status}): ${await readError(response)}`);
  }

  return response.body;
};

export const parseJsonObject = <T,>(content: string, fallback: T): T => {
  try { return JSON.parse(content) as T; } catch {}
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try { return JSON.parse(match[0]) as T; } catch { return fallback; }
};

/**
 * Get the AI provider configuration from environment variables.
 * Priority:
 * 1. If OPENAI_API_KEY is set -> use OpenAI-compatible API (Cline, OpenAI, OpenRouter)
 * 2. If GROQ_API_KEY is set -> use existing Claude/Anthropic API
 * 3. Fallback to keyword-based classifier
 */
export const getAiProviderConfig = (env: Record<string, string | undefined>) => {
  const clineKey = env.CLINE_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  const groqKey = env.GROQ_API_KEY;

  // Priority 1: Cline API (Kimi, Claude, etc. via api.cline.ai)
  if (clineKey) {
    return {
      provider: "openai" as const,
      apiKey: clineKey,
      baseUrl: env.CLINE_API_URL || "https://api.cline.ai/v1",
      model: env.CLINE_MODEL || "Kimi K2.6 Code",
    };
  }

  // Priority 2: OpenAI-compatible API (OpenAI, OpenRouter, local LLMs)
  if (openaiKey) {
    return {
      provider: "openai" as const,
      apiKey: openaiKey,
      baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: env.OPENAI_MODEL || "gpt-4o",
    };
  }

  // Priority 3: Groq / Anthropic fallback
  if (groqKey) {
    return {
      provider: "anthropic" as const,
      apiKey: groqKey,
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-haiku-4-5-20251001",
    };
  }

  return null;
};
