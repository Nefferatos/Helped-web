# AI Agents Architecture

## Purpose

This document describes the recommended AI agent architecture for the Helped support platform.

The goal is to help:

- clients who send support messages
- employees who handle support conversations
- operations staff who need visibility into stalled or risky cases

This design fits the current project structure instead of introducing a separate chatbot product.

## Product Goal

The AI system should act as a supervised support layer inside the existing chat and request flows.

It should:

- reply to common client questions
- collect missing details from clients
- summarize conversations for employees
- suggest replies and next actions to staff
- flag urgent, unhappy, or stalled cases

It should not:

- make legal or policy decisions
- promise refunds, approvals, pricing, or timelines unless backed by system data
- close important cases automatically in the first rollout

## Recommended Architecture

The best approach for this project is a small team of backend AI agents sharing the same conversation data.

Do not place the real AI agent in the frontend.

Reasons:

- API keys must stay private
- AI needs access to trusted backend conversation history
- replies and summaries should be auditable
- human handoff is easier when everything is stored in one system

The frontend should remain a UI layer. The backend should decide when an agent runs and what it is allowed to do.

## Agent Roles

### 1. Client Support Agent

Primary job: handle first-line client conversation inside the existing support chat.

Responsibilities:

- greet new clients
- answer common questions
- ask one clarifying question when needed
- collect structured information
- classify the issue
- escalate to human staff when needed

Allowed actions:

- create chat replies in the client conversation
- produce issue summaries
- mark a case as needing human attention

Not allowed:

- final business commitments
- legal advice
- financial promises

### 2. Staff Assistant Agent

Primary job: help employees work faster and more consistently.

Responsibilities:

- summarize long conversations
- suggest reply drafts
- recommend status, category, and priority
- identify missing information
- suggest next actions

Allowed actions:

- generate internal summaries
- generate draft replies for review
- suggest metadata updates

Not allowed in phase 1:

- auto-send staff replies without review
- resolve or close tickets automatically

### 3. Operations Agent

Primary job: monitor support activity and surface operational risk.

Responsibilities:

- detect stalled conversations
- flag angry or urgent clients
- highlight unresolved employee follow-up
- generate daily or periodic digests

Allowed actions:

- create internal alerts
- generate reports
- recommend escalation

Not allowed in phase 1:

- direct case closure
- autonomous workflow decisions that change customer outcomes

## How It Fits the Current Codebase

The existing project already has the right foundation:

- client support UI: `frontend/src/ClientPage/ClientSupportChat.tsx`
- admin support UI: `frontend/src/pages/AdminSupportChat.tsx`
- chat routes: `backend/src/routes/chatRoutes.ts`
- chat controllers: `backend/src/controllers/chatController.ts`
- persisted support data: `backend/src/store.ts`
- current rule-based bot logic: `frontend/src/hooks/useChatbot.ts`
- existing Anthropic integration example: `backend/src/services/workflowAiService.ts`

The recommended implementation is to keep the rule-based frontend bot only as a fallback and move real AI behavior to backend services.

## End-to-End Flow

### Client Conversation Flow

1. Client sends a message from the existing support chat UI.
2. Backend stores the message first.
3. Backend loads the relevant conversation history and chatbot config.
4. Agent router decides whether the Client Support Agent should reply.
5. Claude generates a reply.
6. Backend stores the AI reply as a normal support message.
7. Admin users see the same thread in the admin inbox.

### Staff Assistance Flow

1. Staff opens a conversation in the admin UI.
2. Frontend requests an AI summary or draft from backend endpoints.
3. Staff Assistant Agent generates:
   - summary
   - suggested reply
   - suggested priority/category/status
4. Staff reviews before sending or applying anything.

### Operations Monitoring Flow

1. Backend scans conversations periodically or after relevant events.
2. Operations Agent checks for:
   - no response for too long
   - repeated client frustration
   - unresolved urgent issues
3. Backend stores alerts or emits internal notifications.

## Recommended Backend Services

Add the following services:

- `backend/src/services/chatAiService.ts`
  - client-facing reply generation
- `backend/src/services/staffAssistantService.ts`
  - summaries, draft replies, classifications
- `backend/src/services/agentRouterService.ts`
  - decides whether to reply, escalate, or only annotate
- `backend/src/services/opsMonitoringService.ts`
  - stalled-case and risk detection
- `backend/src/types/ai.ts`
  - shared AI-related types

## Recommended API Extensions

### Existing Routes To Reuse

- `POST /api/chats/client`
- `GET /api/chats/client`
- `GET /api/chats/admin/:clientId`
- `POST /api/chats/admin/:clientId`

### New Routes To Add

- `POST /api/chats/admin/:clientId/ai-summary`
  - return a short internal summary
- `POST /api/chats/admin/:clientId/ai-draft`
  - return a suggested staff reply
- `POST /api/chats/admin/:clientId/ai-triage`
  - return suggested priority, category, and status
- `POST /api/chats/admin/:clientId/ai-escalate`
  - return escalation recommendation and rationale

These should be admin-only endpoints.

## Recommended Data Additions

To support AI safely, add or derive metadata around messages and conversations.

Suggested message metadata:

- `source: "human" | "ai"`
- `agentType?: "client_support" | "staff_assistant" | "ops"`
- `confidence?: number`
- `needsHuman?: boolean`

Suggested conversation metadata:

- `aiSummary?: string`
- `sentiment?: "positive" | "neutral" | "negative"`
- `riskLevel?: "low" | "medium" | "high"`
- `lastAiAt?: string`
- `lastHumanAt?: string`
- `escalationReason?: string`

These can be added directly to stored records or introduced gradually as computed values before schema expansion.

## Model and Provider Strategy

Claude is a strong fit for this project because the repo already contains an Anthropic integration pattern in `workflowAiService.ts`.

Use Claude on the backend only.

Recommended environment variables:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Recommended model strategy:

- use a pinned production model version
- avoid relying only on moving aliases in production

Example:

- `ANTHROPIC_MODEL=claude-sonnet-4-20250514`

The current repo also uses a Claude example with an older default in another service. The support-agent implementation should use an explicit production model configuration instead of silently inheriting an older default.

## Prompt Design Principles

The Client Support Agent prompt should instruct the model to:

- be warm and concise
- ask at most one follow-up question at a time
- avoid making up facts
- avoid firm promises without system verification
- escalate billing disputes, complaints, legal issues, and low-confidence cases
- summarize clearly for humans when escalation is needed

The Staff Assistant Agent prompt should instruct the model to:

- summarize objectively
- highlight risks and missing information
- suggest a clear next reply
- distinguish facts from inference

The Operations Agent prompt should instruct the model to:

- identify urgency and delay risk
- explain why a case is risky
- recommend operational next steps

## Safety Rules

The AI system must hand off to humans when:

- client is angry or threatening
- payment or refund dispute is involved
- legal, contract, or policy interpretation is required
- the model is uncertain
- the case involves exceptions, complaints, or special approval

Phase 1 should prefer human review over aggressive automation.

## Recommended Rollout Plan

### Phase 1

Build the minimum high-value system:

- Client Support Agent auto-replies in support chat
- Staff Assistant Agent generates conversation summaries
- Staff Assistant Agent generates draft replies
- frontend rule-based bot remains as fallback only

### Phase 2

Add stronger employee tooling:

- AI triage suggestions
- missing-info detection
- case sentiment and urgency flags

### Phase 3

Add operations automation:

- stalled-case monitoring
- digest generation
- escalation recommendation dashboards

## Recommended First Implementation Targets

Start in these files:

- `backend/src/controllers/chatController.ts`
  - trigger AI after saving client messages
- `backend/src/routes/chatRoutes.ts`
  - add admin AI helper endpoints
- `backend/src/store.ts`
  - persist or derive AI metadata
- `frontend/src/pages/AdminSupportChat.tsx`
  - show AI summary and draft reply actions
- `frontend/src/ClientPage/ClientSupportChat.tsx`
  - keep chat UI focused on messaging only

Do not make `frontend/src/hooks/useChatbot.ts` the main production AI layer. Keep it only as fallback logic if the backend AI is unavailable.

## Example Decision Policy

### Auto-reply cases

- greeting
- simple status follow-up
- scheduling question
- document checklist question
- general inquiry

### Human-handoff cases

- complaint
- refund or payment dispute
- legal/policy issue
- emotionally escalated message
- repeated unresolved follow-up
- low-confidence AI response

## Success Metrics

Track:

- average first response time
- number of conversations auto-handled by AI
- number of handoffs to staff
- staff acceptance rate for AI draft replies
- client satisfaction on AI-first conversations
- false escalation and missed escalation rate

## Final Recommendation

For this project, the best AI design is:

- one shared support system
- multiple specialized backend agents
- human review for employee-facing decisions
- gradual rollout with clear handoff rules

The first implementation should focus on two wins:

- client-facing AI replies
- employee-facing AI summaries and draft replies

That gives immediate business value without introducing excessive automation risk.
