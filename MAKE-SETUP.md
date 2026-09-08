# Make.com AI Receptionist — Complete Setup Guide

## Architecture

```
Customer types message → React → Cloudflare Worker → Make.com Webhook → AI Agent → Response → Worker → React
```

If Make.com fails, the Worker automatically falls back to the direct AI pipeline.

---

## STEP 1: Import the Blueprint

1. Go to https://www.make.com and log in
2. Click **Scenarios** → **Create a new scenario**
3. Click **⋯** menu → **Import Blueprint**
4. Select `make/rinzin-ai-receptionist-blueprint.json`
5. Click **Import**

You will see 5 modules: Webhooks → ParseJSON → AI Agent → CreateJSON → WebhookRespond

---

## STEP 2: Create the Webhook

1. Click **Module 1** (Webhooks)
2. Click **Add** to create a new webhook
3. Name: `AI Receptionist Chat Webhook`
4. Click **Save**
5. **Copy the webhook URL** (looks like `https://hook.eu1.make.com/xxx`)
6. Click **OK**

---

## STEP 3: Configure ParseJSON

1. Click **Module 2** (ParseJSON)
2. JSON field should show: `{{1.data}}`
3. Data structure field:
   - Click **Add** → **Generate**
   - Paste this JSON:
   ```json
   {"conversationId":"test","userId":"123","message":"Hello","page":"/","history":[],"context":{"company":{"name":"Agency","phone":"","email":"","whatsapp":"","whatsappLink":"","officeHours":"","address":"","website":"","aboutUs":""},"faqs":[],"maidSummary":{"total":0,"nationalities":[],"types":[]}},"timestamp":"2026-01-01T00:00:00Z"}
   ```
   - Click **Save**
   - Set **Strict** to **No**
   - Click **OK**

---

## STEP 4: Configure the AI Agent

1. Click **Module 3** (AI Agent)
2. **Connection**: Click dropdown → **Add** → Enter your OpenAI or Anthropic API key → **Save**
3. **Model**: Select `gpt-4o-mini`
4. **System prompt**: Pre-configured (edit if needed)
5. **Message**: Pre-configured (leave as-is)
6. **Thread ID**: Should show `{{2.conversationId}}`
7. Click **OK**

---

## STEP 5: Verify CreateJSON (Module 4)

1. Click **Module 4**
2. Pre-configured — no changes needed
3. Click **OK**

---

## STEP 6: Verify WebhookRespond (Module 5)

1. Click **Module 5**
2. Status: `200`, Body: `{{4.data}}`
3. Click **OK**

---

## STEP 7: Set Worker Secrets

```bash
cd c:\hh\Helped-web

# Set Make.com webhook URL (paste URL from Step 2)
npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_URL

# Set shared secret
npx wrangler secret put MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET
```

For local development, add to `.dev.vars`:
```
MAKE_AI_RECEPTIONIST_WEBHOOK_URL=https://hook.eu1.make.com/your-url
MAKE_AI_RECEPTIONIST_WEBHOOK_SECRET=your-secret
```

---

## STEP 8: Test

1. In Make.com, click **Run once**
2. Run in terminal:
```bash
curl -X POST http://localhost:8787/api/ai/receptionist \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need a maid"}'
```
3. Verify each module lights up green
4. Check final output is valid JSON

---

## STEP 9: Activate

1. Toggle scheduling to **ON**
2. Set to **Immediately**
3. Click **Save**

---

## Test Commands

```bash
# Greeting
curl -X POST http://localhost:8787/api/ai/receptionist -H "Content-Type: application/json" -d '{"message":"Hi"}'

# Maid request
curl -X POST http://localhost:8787/api/ai/receptionist -H "Content-Type: application/json" -d '{"message":"I need a Myanmar maid"}'

# Human handoff
curl -X POST http://localhost:8787/api/ai/receptionist -H "Content-Type: application/json" -d '{"message":"I want to speak to a real person"}'
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook not receiving | Check `MAKE_AI_RECEPTIONIST_WEBHOOK_URL` is correct |
| ParseJSON error | Set Data Structure **Strict** to **No** |
| AI not responding | Check API key connection |
| Response empty | Check AI Agent output in execution history |
| Fallback response | Make.com failed — check logs with `npx wrangler tail` |

---

## Adding Tools (Future)

1. In AI Agent module, click **Add tool**
2. Select **HTTP** type
3. URL: `https://findmaid.wow-aisolution.workers.dev/api/public-maids`
4. Method: `GET`

---

## Security

- Webhook URL is server-side only (never in React)
- No Supabase credentials sent to Make.com
- No API keys sent to Make.com
- Conversation IDs are random UUIDs