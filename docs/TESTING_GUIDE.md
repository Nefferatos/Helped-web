# Testing Guide — AI Assistant & AI Command Center

## Quick Test Commands

Run these from the project root (`c:\hh\Helped-web`):

```bash
# Test all AI features (comprehensive)
node scripts/test-all-ai-features.mjs

# Test AI Assistant & Command Center specifically
node scripts/test-ai-assistant-command-center.mjs
```

---

## 1. Test AI Command Center Chat (AiAgentsPage)

### Steps:
1. Open the agency admin portal: `https://findmaid.wow-aisolution.workers.dev/agencyadmin/login`
2. Log in with your admin credentials
3. Navigate to **AI Agents** page (the AiAgentsPage)
4. In the **AI Command Center** section, click on any topic card (Enquiries, Requests, Applicants, or Contracts)
5. Type a message in the chat input, e.g.: `"I need a Filipino maid for childcare, budget $600-700"`
6. Press Enter or click Send

### Expected Result:
- ✅ You see your message appear as a user bubble
- ✅ After 1-3 seconds, an AI response appears as an assistant bubble
- ✅ The response contains a reply text (not `undefined`)
- ✅ Metadata badges appear below the response (AI tag, intent tag, matches count)
- ✅ No console errors in browser DevTools

### What was fixed:
The `/api/inquiry` response was wrapped in a `data` key by `buildWorkflowResponse`, but the frontend expected `reply`, `inquiry`, and `matches` at the top level. The fix in `useAiAutomation.ts` now unwraps the nested response.

---

## 2. Test AI Assistant Bubble Chat (ApplicantAiAssistant)

### Steps:
1. Open the public maid application page (where applicants fill in their profile)
2. Look for the **floating purple bot button** in the bottom-right corner (shows readiness score)
3. Click the button to open the AI Assistant chat
4. Try these messages:
   - `"Hi"` → Should greet you by name and show readiness
   - `"What's missing?"` → Should list missing required fields
   - `"How can I improve?"` → Should give personalized tips
   - `"What should I do next?"` → Should guide you to the next step
   - `"What are my skills?"` → Should show skill ratings
   - `"How do I write a cover note?"` → Should give cover note advice

### Expected Result:
- ✅ Responses are warm, conversational, and use your first name
- ✅ Responses reference your actual form data (readiness %, missing fields)
- ✅ Quick action buttons appear when chat first opens
- ✅ Readiness bar shows at the top with correct percentage

### What was fixed:
The pre-submission responses were robotic keyword-matching. Now they're conversational and human-like, with greetings, encouragement, and personalized advice.

---

## 3. Test AI HR Interview Schedule & Email

### Steps:
1. Open the AI HR Interviewer page: Navigate to the HR Interviewer section in the admin portal
2. Fill in candidate details:
   - **Name**: `Maria Santos`
   - **Email**: `your-real-email@example.com` (use a real email to receive the test)
   - **Position**: `Domestic Worker (Childcare)`
3. **Schedule Interview**:
   - Pick a date (e.g., tomorrow)
   - Pick a time (e.g., 2:00 PM)
   - Click **"Send Interview Invitation"**
4. **Start Interview** (optional):
   - Click **"Start Interview Now"**
   - Answer the AI's questions
   - Complete the interview
5. **Send Result Email**:
   - After interview completes, click **"Pass Email"** or **"Fail Email"**

### Expected Result:
- ✅ Toast notification: `"Invitation sent to [email] for [date] at [time]"`
- ✅ Check your email inbox — you should receive a professionally formatted HTML email from the Make.com workflow
- ✅ The email contains the candidate name, position, date/time, and agency branding
- ✅ Pass emails show score and strengths; Fail emails show areas for improvement

### What was fixed:
- Frontend now sends structured data (`candidateName`, `position`, `scheduledDate`, `rating`, `strengthsHtml`, etc.) instead of pre-composed plain text
- Backend now forwards the entire structured payload to Make.com (which generates its own HTML templates and sends via Gmail)

---

## 4. Test AI Receptionist (Public Chatbot)

### Steps:
1. Open the public website: `https://rinzinagency.com`
2. Open the chat widget (if available) or use the API directly
3. Try these messages:
   - `"I need a helper who can cook Chinese food"`
   - `"How much does it cost to hire a helper?"`
   - `"What nationalities do you have?"`

### Expected Result:
- ✅ AI responds with relevant helper recommendations
- ✅ Responses mention specific maids by name and reference code
- ✅ Responses are 500-1200 characters long
- ✅ No generic "I can't help with that" responses

---

## 5. Automated API Tests

### Test HR Interview Email Endpoint:
```bash
# Interview invitation
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/hr-interview/email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","candidateName":"Maria Santos","position":"Domestic Worker","type":"interview_invitation","scheduledDate":"Monday, August 25, 2026","scheduledTime":"02:00 PM"}'

# Pass result
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/hr-interview/email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","candidateName":"Maria Santos","position":"Domestic Worker","type":"pass","rating":82,"strengthsHtml":"<li>Detailed responses</li><li>International experience</li>"}'

# Fail result
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/hr-interview/email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","candidateName":"Priya Sharma","position":"Domestic Worker","type":"fail","weaknessesHtml":"<li>Brief responses</li><li>Limited experience</li>"}'
```

### Test AI Inquiry (Command Center):
```bash
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/inquiry \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","contact":"test@example.com","message":"I need a Filipino maid for childcare"}'
```

### Test AI Receptionist:
```bash
curl -X POST https://findmaid.wow-aisolution.workers.dev/api/ai/receptionist \
  -H "Content-Type: application/json" \
  -d '{"message":"I need a helper who can cook and take care of children","agentId":"receptionist"}'
```

### Expected responses:
All should return `{"ok":true,"message":"Email queued via Make.com automation","provider":"make.com"}` or similar success responses.

---

## 6. Verify Make.com Workflow

1. Go to your Make.com dashboard
2. Open the **"Helped HR Interview Email Notifications"** scenario
3. Check the **History** tab for recent runs
4. Each run should show:
   - Module 1 (Webhook): Received structured data with `type`, `candidateName`, `position`, etc.
   - Module 2 (Sleep): 1 second delay
   - Module 3 (Router): Routed to correct branch based on `type`
   - Module 4-6 (Compose + Gmail): HTML email composed and sent

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Chat shows `undefined` | Response structure mismatch | Already fixed in `useAiAutomation.ts` |
| Email returns `"to, subject, and body are required"` | Old backend code deployed | Already fixed — redeploy with `npx wrangler deploy` |
| Email returns `"Email service is not configured"` | No Make.com webhook URL set | Set `MAKE_WEBHOOK_URL` in Cloudflare Worker secrets |
| AI responses are slow (10-30s) | AI model processing time | Normal — Kimi K2.6 Code takes time for quality responses |
| AI returns 503 | AI API key not configured | Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in Worker secrets |
| CORS errors | Origin not allowed | Add your domain to the CORS allowlist in `[[...path]].ts` |