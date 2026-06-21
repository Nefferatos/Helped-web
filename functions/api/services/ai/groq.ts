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

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const rateLimitBuckets = new Map<string, number[]>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const assertAiRateLimit = (key: string, limit = 30, windowMs = 60_000) => {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) throw new Error("AI rate limit exceeded. Please try again in a minute.");
  recent.push(now);
  rateLimitBuckets.set(key, recent);
};

const parseJson = <T>(text: string): T | null => {
  if (!text.trim()) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
};

const extractForAnthropic = (messages: GroqMessage[]) => {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const system = systemParts.length > 0 ? systemParts.join("\n\n") : undefined;
  const nonSystem = messages.filter((m) => m.role !== "system") as Array<{ role: "user" | "assistant"; content: string }>;
  const sanitized: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of nonSystem) {
    const last = sanitized[sanitized.length - 1];
    if (last?.role === msg.role) {
      last.content += "\n\n" + msg.content;
    } else {
      sanitized.push({ role: msg.role, content: msg.content });
    }
  }
  if (sanitized.length === 0 || sanitized[0].role === "assistant") {
    sanitized.unshift({ role: "user", content: "Continue." });
  }
  return { system, messages: sanitized };
};

const readError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  const body = parseJson<{ error?: { message?: string } }>(text);
  return body?.error?.message || text.trim() || response.statusText || "No response body";
};

export const groqChat = async (options: GroqChatOptions) => {
  const retries = options.retries ?? 2;
  let lastError: Error | null = null;
  const { system, messages } = extractForAnthropic(options.messages);
  const finalSystem = options.responseFormat === "json_object"
    ? `${system ? `${system}\n\n` : ""}You MUST respond with valid JSON only, no other text.`
    : system;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        signal: options.signal,
        headers: {
          "x-api-key": options.apiKey.trim(),
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: options.maxTokens ?? 1000,
          temperature: options.temperature ?? 0.25,
          ...(finalSystem ? { system: finalSystem } : {}),
          messages,
        }),
      });

      if (!response.ok) {
        const message = await readError(response);
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Claude request failed (${response.status}): ${message}`);
      }

      const text = await response.text();
      const data = parseJson<{
        id?: string;
        content?: Array<{ type: string; text?: string }>;
        usage?: Record<string, unknown>;
      }>(text);
      if (!data) {
        throw new Error(
          text.trim()
            ? `Claude returned a non-JSON response: ${text.trim().slice(0, 200)}`
            : "Claude returned an empty response.",
        );
      }

      return {
        id: data.id ?? "",
        content: data.content?.find((c) => c.type === "text")?.text?.trim() ?? "",
        usage: data.usage ?? {},
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Claude request failed");
      if (attempt < retries) {
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error("Claude request failed");
};

export const groqChatStream = async (options: GroqChatOptions) => {
  const { system, messages } = extractForAnthropic(options.messages);

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    signal: options.signal,
    headers: {
      "x-api-key": options.apiKey.trim(),
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.25,
      ...(system ? { system } : {}),
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Claude stream failed (${response.status}): ${await readError(response)}`);
  }

  return convertToOpenAISSE(response.body);
};

const convertToOpenAISSE = (body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-${crypto.randomUUID()}`;
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;
          try {
            const event = JSON.parse(dataStr) as Record<string, unknown>;
            if (event.type === "content_block_delta") {
              const delta = (event.delta ?? {}) as Record<string, unknown>;
              if (delta.type === "text_delta" && typeof delta.text === "string") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ id, choices: [{ delta: { content: delta.text }, index: 0 }] })}\n\n`,
                  ),
                );
              }
            } else if (event.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch {
            // skip malformed events
          }
        }
      },
      flush(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    }),
  );
};

export const parseJsonObject = <T>(content: string, fallback: T): T => {
  try { return JSON.parse(content) as T; } catch {}
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try { return JSON.parse(match[0]) as T; } catch { return fallback; }
};
