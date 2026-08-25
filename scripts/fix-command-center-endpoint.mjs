#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";

const path = "functions/api/[[...path]].ts";
let content = readFileSync(path, "utf8");

// Find the endpoint by looking for the unique start and the next app.post after it
const startMarker = '// AI Command Center Chat Proxy\r\napp.post(\r\n  "/api/ai/command-center/chat",';
const startIdx = content.indexOf(startMarker);

if (startIdx < 0) {
  // Try with \n instead
  const alt = '// AI Command Center Chat Proxy\napp.post(\n  "/api/ai/command-center/chat",';
  const altIdx = content.indexOf(alt);
  if (altIdx < 0) {
    console.log("ERROR: Could not find start of endpoint");
    process.exit(1);
  }
}

// Find the end: look for the next "app.post(" after the start
const afterStart = content.slice(startIdx + startMarker.length);
const nextAppPost = afterStart.indexOf("\r\napp.post(");
if (nextAppPost < 0) {
  console.log("ERROR: Could not find end of endpoint");
  process.exit(1);
}

const endIdx = startIdx + startMarker.length + nextAppPost;

const newEndpoint = `// AI Command Center Chat Proxy
app.post(
  "/api/ai/command-center/chat",
  safeApi(async (c) => {
    const body = await parseBody<{ messages?: Array<{ role: string; content: string }>; system?: string; }>(c.req.raw);
    const messages = body?.messages;
    const systemPrompt = body?.system || "You are a helpful AI assistant.";
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages array is required" }, 400);
    }

    const { openaiChat } = await import("./services/ai/openai");
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    // Try providers in order: Cline API, then OpenAI
    const providers = [
      { key: c.env.CLINE_API_KEY?.trim(), url: c.env.CLINE_API_URL?.trim(), model: c.env.CLINE_MODEL?.trim() || "Kimi K2.6 Code", name: "Cline" },
      { key: c.env.OPENAI_API_KEY?.trim(), url: c.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1", model: c.env.OPENAI_MODEL?.trim() || "gpt-4o", name: "OpenAI" },
    ];

    const errors: string[] = [];
    for (const p of providers) {
      if (!p.key) { errors.push(p.name + ": no API key"); continue; }
      try {
        const reply = await openaiChat({ apiKey: p.key, model: p.model, baseUrl: p.url, maxTokens: 1024, messages: chatMessages });
        return c.json({ reply });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        errors.push(p.name + ": " + msg);
        console.error("[command-center] " + p.name + " failed:", msg);
      }
    }

    return c.json({ error: "All AI providers failed: " + errors.join("; ") }, 500);
  }),
);

`;

content = content.slice(0, startIdx) + newEndpoint + content.slice(endIdx);
writeFileSync(path, content, "utf8");
console.log("SUCCESS: Replaced command-center endpoint with multi-provider fallback");