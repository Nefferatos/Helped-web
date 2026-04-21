# Make.com Scenario Templates

This backend supports Make.com through `POST /api/send-to-make` and direct backend endpoints.

## Recommended env vars

Use these keys in `backend/.env`:

```env
MAKE_WEBHOOK_URL=https://hook.make.com/your-default-webhook
MAKE_WEBHOOK_URL_LEAD_PIPELINE=https://hook.make.com/your-lead-webhook
MAKE_WEBHOOK_URL_INQUIRY_PIPELINE=https://hook.make.com/your-inquiry-webhook
MAKE_WEBHOOK_URL_MATCHING_PIPELINE=https://hook.make.com/your-matching-webhook
MAKE_WEBHOOK_URL_NOTIFICATION_PIPELINE=https://hook.make.com/your-notification-webhook
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

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

If `OPENAI_API_KEY` is missing, the backend still works using fallback rules.
If a Make webhook URL is missing, `POST /api/send-to-make` returns a recorded failure instead of crashing the API.
