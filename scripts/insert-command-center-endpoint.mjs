#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";

const path = "functions/api/[[...path]].ts";
let content = readFileSync(path, "utf8");

// Remove old endpoint if present
const oldStart = content.indexOf('// AI Command Center Chat Proxy\r\napp.post(');
if (oldStart >= 0) {
  const afterOld = content.slice(oldStart);
  const nextApp = afterOld.indexOf('\r\napp.post(\r\n  "/api/ai/hr-interview');
  if (nextApp >= 0) {
    content = content.slice(0, oldStart) + content.slice(oldStart + nextApp);
    console.log("Removed old endpoint");
  }
}

const marker = 'app.post(\r\n  "/api/ai/hr-interview/chat",';
const idx = content.indexOf(marker);

if (idx < 0) {
  console.log("ERROR: Could not find hr-interview/chat endpoint");
  process.exit(1);
}

const endpoint = [
  '// AI Command Center Chat Proxy',
  'app.post(',
  '  "/api/ai/command-center/chat",',
  '  safeApi(async (c) => {',
  '    const body = await parseBody<{ messages?: Array<{ role: string; content: string }>; system?: string; }>(c.req.raw);',
  '    const messages = body?.messages;',
  '    const systemPrompt = body?.system || "You are a helpful AI assistant.";',
  '    if (!messages || !Array.isArray(messages) || messages.length === 0) {',
  '      return c.json({ error: "messages array is required" }, 400);',
  '    }',
  '',
  '    const errors: string[] = [];',
  '',
  '    // Provider 1: Cline AI (api.cline.bot) — OpenAI-compatible with data wrapper',
  '    const clineKey = c.env.CLINE_API_KEY?.trim();',
  '    const clineUrl = c.env.CLINE_API_URL?.trim() || "https://api.cline.bot/api/v1";',
  '    const clineModel = c.env.CLINE_MODEL?.trim() || "openai/gpt-4o-mini";',
  '    if (clineKey) {',
  '      try {',
  '        const response = await fetch(clineUrl + "/chat/completions", {',
  '          method: "POST",',
  '          headers: { "Content-Type": "application/json", Authorization: "Bearer " + clineKey },',
  '          body: JSON.stringify({',
  '            model: clineModel,',
  '            messages: [{ role: "system", content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.content }))],',
  '            max_tokens: 1024,',
  '          }),',
  '          signal: AbortSignal.timeout(30000),',
  '        });',
  '        if (response.ok) {',
  '          const raw = await response.json() as Record<string, unknown>;',
  '          // Cline API wraps response in { data: { choices: [...] } }',
  '          const data = (raw.data ?? raw) as { choices?: Array<{ message?: { content?: string } }> };',
  '          const reply = data.choices?.[0]?.message?.content || "I could not generate a response.";',
  '          return c.json({ reply });',
  '        }',
  '        const errText = await response.text().catch(() => "");',
  '        errors.push("Cline (" + response.status + "): " + errText.slice(0, 200));',
  '      } catch (err) {',
  '        errors.push("Cline: " + (err instanceof Error ? err.message : "unknown"));',
  '      }',
  '    } else {',
  '      errors.push("Cline: no API key");',
  '    }',
  '',
  '    // Provider 2: Anthropic Claude API',
  '    const anthropicKey = c.env.ANTHROPIC_API_KEY?.trim();',
  '    const anthropicModel = c.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5";',
  '    if (anthropicKey) {',
  '      try {',
  '        const response = await fetch("https://api.anthropic.com/v1/messages", {',
  '          method: "POST",',
  '          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },',
  '          body: JSON.stringify({',
  '            model: anthropicModel, max_tokens: 1024, system: systemPrompt,',
  '            messages: messages.map((m) => ({ role: m.role, content: m.content })),',
  '          }),',
  '          signal: AbortSignal.timeout(30000),',
  '        });',
  '        if (response.ok) {',
  '          const data = await response.json() as { content?: Array<{ text?: string }> };',
  '          return c.json({ reply: data.content?.[0]?.text || "I could not generate a response." });',
  '        }',
  '        errors.push("Anthropic (" + response.status + ")");',
  '      } catch (err) {',
  '        errors.push("Anthropic: " + (err instanceof Error ? err.message : "unknown"));',
  '      }',
  '    }',
  '',
  '    return c.json({ error: "All AI providers failed: " + errors.join("; ") }, 500);',
  '  }),',
  ');',
  '',
].join('\r\n');

content = content.slice(0, idx) + endpoint + content.slice(idx);
writeFileSync(path, content, "utf8");
console.log("SUCCESS: Inserted /api/ai/command-center/chat with Cline (api.cline.bot) + Anthropic fallback");