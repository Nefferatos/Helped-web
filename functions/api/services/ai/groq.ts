export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqChatOptions = {
  apiKey: string;
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
  retries?: number;
  signal?: AbortSignal;
};

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const rateLimitBuckets = new Map<string, number[]>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const assertAiRateLimit = (
  key: string,
  limit = 30,
  windowMs = 60_000,
) => {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    throw new Error("AI rate limit exceeded. Please try again in a minute.");
  }
  recent.push(now);
  rateLimitBuckets.set(key, recent);
};

const parseJson = <T>(text: string): T | null => {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const readGroqError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  const body = parseJson<{ error?: { message?: string } }>(text);
  return body?.error?.message || text.trim() || response.statusText || "No response body";
};

export const groqChat = async (options: GroqChatOptions) => {
  const retries = options.retries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        signal: options.signal,
        headers: {
          authorization: `Bearer ${options.apiKey.trim()}`,
          "content-type": "application/json",
          "user-agent": "helped-web-worker/1.0",
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.25,
          max_tokens: options.maxTokens ?? 1000,
          response_format:
            options.responseFormat === "json_object" ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        const message = await readGroqError(response);
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Groq request failed (${response.status}): ${message}`);
      }

      const text = await response.text();
      const data = parseJson<{
        id?: string;
        usage?: Record<string, unknown>;
        choices?: Array<{ message?: { content?: string } }>;
      }>(text);
      if (!data) {
        throw new Error(
          text.trim()
            ? `Groq returned a non-JSON response: ${text.trim().slice(0, 200)}`
            : "Groq returned an empty response.",
        );
      }

      return {
        id: data.id ?? "",
        content: data.choices?.[0]?.message?.content?.trim() ?? "",
        usage: data.usage ?? {},
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Groq request failed");
      if (attempt < retries) {
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Groq request failed");
};

export const groqChatStream = async (options: GroqChatOptions) => {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    signal: options.signal,
    headers: {
      authorization: `Bearer ${options.apiKey.trim()}`,
      "content-type": "application/json",
      "user-agent": "helped-web-worker/1.0",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Groq stream failed (${response.status}): ${await readGroqError(response)}`);
  }

  return response.body;
};

export const parseJsonObject = <T>(content: string, fallback: T): T => {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return fallback;
    }
  }
};
