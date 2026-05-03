# Make.com Scenario Templates

Note:
If the team is migrating away from Make.com toward Google Cloud AI agents, see
`backend/docs/google-cloud-ai-architecture.md` for the recommended replacement structure.

This backend supports Make.com through `POST /api/send-to-make` and direct backend endpoints.

## Recommended env vars

Use these keys in `backend/.env`:

 

# Lead pipeline (pick ONE correct lead webhook)
 

## Scenario 1: Lead Intake

Trigger:
- Facebook Lead Ads
- Website form
- Scraped lead source

HTTP call into backend:

```http
POST /api/leads/raw
Content-Type: application/json

{
  "source": "facebook",
  "message": "Need transfer maid for elderly care in Tampines, budget SGD 700, urgent",
  "name": "Alicia Tan",
  "contact": "+6591234567"
}
```

Expected backend response:
- Creates structured lead
- Enriches and qualifies lead
- Saves internal notification

Optional Make relay:

```http
POST /api/send-to-make
Content-Type: application/json

{
  "scenario": "lead_pipeline",
  "payload": {
    "event": "lead.created",
    "source": "facebook",
    "leadName": "Alicia Tan"
  }
}
```

## Scenario 2: AI Inquiry Handling

Trigger:
- Website chat
- WhatsApp sync
- Facebook Messenger sync

Backend endpoint:

```http
POST /api/inquiry
Content-Type: application/json

{
  "name": "Marcus",
  "contact": "marcus@example.com",
  "message": "I want to hire a maid for childcare in Woodlands with budget 800",
  "employerId": 12
}
```

Response includes:
- intent
- workflow assignment
- generated reply
- optional match candidates for hiring intent

### Make AI Agent -> Inquiry -> Make relay

If you want a Make AI Agent to call the backend once and automatically relay the processed inquiry
back into Make, use:

```http
POST /api/inquiry/make
Content-Type: application/json

{
  "source": "make_ai_agent",
  "channel": "webhook",
  "conversationId": "conv_123",
  "messageId": "msg_456",
  "receivedAt": "2026-05-02T10:30:00+08:00",
  "name": "Marcus",
  "contact": "marcus@example.com",
  "message": "I want to hire a maid for childcare in Woodlands with budget 800",
  "employerId": 12,
  "metadata": {
    "language": "en",
    "agentRoute": "inquiry_pipeline"
  }
}
```

Optional fields:
- `makeScenario`: override default scenario name (`inquiry_pipeline`)
- `makeUrl`: override webhook URL for a one-off request

Expected behavior:
- Processes the inquiry through backend AI/fallback logic
- Generates hiring matches when applicable
- Relays the structured result to Make using the `inquiry_pipeline` scenario
- Returns both the inquiry result and the Make delivery status

Example response shape:

```json
{
  "inquiry": {
    "id": 1,
    "name": "Marcus",
    "contact": "marcus@example.com",
    "message": "I want to hire a maid for childcare in Woodlands with budget 800",
    "intent": "hiring",
    "workflow": "maid_matching",
    "reply": "Thanks for your hiring request. We are reviewing your requirements now and will shortlist suitable maid profiles for you shortly.",
    "aiUsed": true,
    "createdAt": "2026-05-02T10:30:00.000Z"
  },
  "matches": [],
  "reply": "Thanks for your hiring request. We are reviewing your requirements now and will shortlist suitable maid profiles for you shortly.",
  "makeTriggered": true,
  "makeDelivery": {
    "id": 1,
    "scenario": "inquiry_pipeline",
    "success": true,
    "statusCode": 200
  }
}
```

## Scenario 3: Maid Matching

Trigger:
- Qualified lead
- Inquiry intent = hiring

Backend endpoint:

```http
POST /api/match
Content-Type: application/json

{
  "employerId": 12,
  "message": "Need elderly care helper in Yishun, salary 700, immediate"
}
```

Use the returned top 3 match records in Make to:
- send employer shortlist
- create CRM task
- notify sales

## Scenario 4: Interview Scheduling

Backend endpoint:

```http
POST /api/schedule
Content-Type: application/json

{
  "maidId": 4,
  "employerId": 12,
  "datetime": "2026-04-25T10:00:00+08:00"
}
```

Recommended Make actions:
- create calendar event
- send WhatsApp or email reminders

## Scenario 5: Contract Generation

Backend endpoint:

```http
POST /api/contracts/generate
Content-Type: application/json

{
  "maidId": 4,
  "employerId": 12,
  "serviceType": "eldercare",
  "location": "Yishun",
  "budgetText": "SGD 700",
  "scheduleDate": "2026-04-25"
}
```

Recommended Make actions:
- generate PDF from returned text
- store in Supabase or Drive
- notify employer and admin

### Make Local AI Agent routing for contract generation

If you use a Make AI agent before the HTTP module, make sure the agent returns parsed JSON and
the next HTTP module maps values from the AI output instead of using blank placeholders.

Recommended AI output for contract requests:

```json
{
  "workflow": "contract_creation",
  "intent": "generate_contract",
  "requiresHuman": false,
  "reason": "",
  "payload": {
    "source": "website",
    "name": "Marcus",
    "contact": "marcus@example.com",
    "message": "Please generate a contract for maid 4 and employer 12",
    "employerId": 12,
    "maidId": 4,
    "datetime": null,
    "serviceType": "eldercare",
    "location": "Yishun",
    "budgetText": "SGD 700",
    "scheduleDate": "2026-04-25",
    "recipient": "",
    "notificationMessage": "",
    "channel": ""
  }
}
```

For the Make HTTP module:

- Method: `POST`
- URL: `https://helped-web-v2.jonathan-tan-1290.workers.dev/api/contracts/generate`
- Header: `Content-Type: application/json`
- Body type: `Raw`
- Content type: `application/json`

Body:

```json
{
  "maidId": {{10.payload.maidId}},
  "employerId": {{10.payload.employerId}},
  "serviceType": "{{10.payload.serviceType}}",
  "location": "{{10.payload.location}}",
  "budgetText": "{{10.payload.budgetText}}",
  "scheduleDate": "{{10.payload.scheduleDate}}"
}
```

Important:

- `maidId` and `employerId` must be real numbers, not empty values.
- Do not send the string `"null"` for IDs. Send JSON `null` from the AI step, or do not route to
  contract generation at all.
- Add a router filter before this module: `workflow = contract_creation`
- Add a guard filter: `maidId exists` and `employerId exists`

For schedule creation, use the same pattern with:

```http
POST /api/schedule
```

```json
{
  "maidId": {{10.payload.maidId}},
  "employerId": {{10.payload.employerId}},
  "datetime": "{{10.payload.datetime}}"
}
```

### Recommended Make AI agent config

Use `outputType = text`, then enable response parsing in the next Make step so the JSON fields are
available for routing and mapping.

Recommended system prompt:

```text
You are a workflow orchestrator for a maid agency platform.

Choose exactly one workflow:
- lead_scoring
- inquiry_only
- inquiry_match
- contract_creation
- schedule_creation
- notification_only
- validation_error
- human_review

Decision rules:
- If the message is about hiring a maid, recommending maids, shortlisting maids, or matching maids, choose inquiry_match.
- If maidId is missing or null, never choose contract_creation.
- If maidId is missing or null, never choose schedule_creation.
- If employerId is missing or null, never choose contract_creation.
- If employerId is missing or null, never choose schedule_creation.
- If user role is guest, never choose contract_creation.
- If user role is guest, never choose schedule_creation.
- Use contract_creation only when:
  1. the user explicitly asks to create or generate a contract
  2. employerId is present as a positive integer
  3. maidId is present as a positive integer
  4. user role is not guest
- Use schedule_creation only when:
  1. the user explicitly asks to schedule or book
  2. employerId is present as a positive integer
  3. maidId is present as a positive integer
  4. scheduleDateTime is present
  5. user role is not guest

Workflow rules:
- Use lead_scoring for new leads or lead qualification.
- Use inquiry_only for general inquiry storage.
- Use inquiry_match for hiring, recommendation, shortlist, or maid-matching requests.
- Use notification_only only for delivery-only actions.
- Use validation_error if required fields are missing for the requested action.
- Use human_review if the request is ambiguous, risky, or policy-sensitive.
- Do not invent IDs, names, dates, or database records.

Field copy rules:
- Copy customer name into payload.name
- Copy customer contact into payload.contact
- Copy message into payload.message exactly
- Copy employerId into payload.employerId when it is a valid positive integer, otherwise null
- Copy maidId into payload.maidId when it is a valid positive integer, otherwise null
- Copy scheduleDateTime into payload.datetime when present, otherwise null
- Copy serviceType into payload.serviceType when present, otherwise ""
- Copy location into payload.location when present, otherwise ""
- Copy budgetText into payload.budgetText when present, otherwise ""
- Copy scheduleDate into payload.scheduleDate when present, otherwise ""

Intent hints:
- "I want to hire a maid"
- "recommend top 3 maids"
- "shortlist maids"
- "match me with a maid"
Always choose inquiry_match unless the user is explicitly requesting contract generation or scheduling and all required IDs are present.

Return only valid JSON.
Do not use markdown.
Do not use code fences.
Do not explain anything.

Return this exact structure:
{
  "workflow": "",
  "intent": "",
  "requiresHuman": false,
  "reason": "",
  "payload": {
    "source": "website",
    "name": "",
    "contact": "",
    "message": "",
    "employerId": null,
    "maidId": null,
    "datetime": null,
    "serviceType": "",
    "location": "",
    "budgetText": "",
    "scheduleDate": "",
    "recipient": "",
    "notificationMessage": "",
    "channel": ""
  }
}
```

Recommended message template:

```text
Action: {{1.action}}
User role: {{ifempty(1.actor.role; "guest")}}
User id: {{ifempty(1.actor.id; "")}}
Customer name: {{ifempty(1.customer.name; "")}}
Customer contact: {{ifempty(1.customer.contact; "")}}
Message: {{ifempty(1.message; "")}}
Employer ID: {{ifempty(1.context.employerId; "")}}
Maid ID: {{ifempty(1.context.maidId; "")}}
Schedule datetime: {{ifempty(1.context.scheduleDateTime; "")}}
Service type: {{ifempty(1.context.serviceType; "")}}
Location: {{ifempty(1.context.location; "")}}
Budget text: {{ifempty(1.context.budgetText; "")}}
Schedule date: {{ifempty(1.context.scheduleDate; "")}}
```

Why this matters:

- Prefer empty strings in the Make input template, not the literal string `"null"`.
- Let the AI output real JSON `null` values for `payload.employerId`, `payload.maidId`, and
  `payload.datetime`.
- Route to contract and schedule HTTP modules only after checking the returned `workflow`.

Recommended router filters after the AI step:

- `workflow = inquiry_match` -> maid matching flow
- `workflow = contract_creation` and `payload.maidId` exists and `payload.employerId` exists -> contract flow
- `workflow = schedule_creation` and `payload.maidId` exists and `payload.employerId` exists and `payload.datetime` exists -> schedule flow
- `workflow = validation_error` or `workflow = human_review` -> notification or manual review flow

## Scenario 6: Notifications

Backend endpoint:

```http
POST /api/notify
Content-Type: application/json

{
  "channel": "email",
  "recipient": "sales-team@agency.local",
  "message": "New high priority lead assigned",
  "referenceType": "lead",
  "referenceId": "1"
}
```

Alternative message endpoint:

```http
POST /api/send-message
Content-Type: application/json

{
  "recipient": "employer:12",
  "message": "Your shortlist is ready",
  "channel": "internal"
}
```

## Scenario 7: Read Backend Data from Make

Useful endpoints for Make HTTP modules:

```http
GET /api/leads
GET /api/maids
GET /api/dashboard
```

## Suggested Make routing map

- `lead_pipeline`: CRM sync, sales alert, spreadsheet append
- `inquiry_pipeline`: support queue, canned reply audit, messaging sync
- `matching_pipeline`: shortlist messaging, scheduler, follow-up tasks
- `notification_pipeline`: email, WhatsApp, SMS fanout

## Important note

If no Claude / Anthropic API key is configured, the backend still works using fallback rules.
If a Make webhook URL is missing, `POST /api/send-to-make` returns a recorded failure instead of crashing the API.
For `POST /api/inquiry/make`, set `MAKE_WEBHOOK_URL_INQUIRY_PIPELINE` in `backend/.env` to enable the relay.
