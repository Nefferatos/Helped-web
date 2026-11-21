# Command Center Agent Registry

This is the routing registry for the six specialized agents exposed by the planner API. These registered specialists remain planning-only; they are separate from `/api/ai/command-center/chat`, which receives a bounded agency-scoped website data snapshot and may propose actions from a separate server-side API allowlist. The chat validates proposals, and staff must approve each proposed change before the frontend calls the existing authenticated website API. This does not grant arbitrary SQL, URL, table, or method access.

| Agent ID | Scope | Routing examples | Current execution state |
|---|---|---|---|
| `applicant_agent` | Applicant and recruitment intelligence | Applicant search, profile summary, missing information, screening summary | Planner may assign; no new Command Center tools execute. Existing ATS workflows remain authoritative. |
| `employer_agent` | Employer requirements and support | Employer search, requirement summary, follow-up draft, matching request | Planner may assign; no cross-employer disclosure. Existing portal authorization remains authoritative. |
| `marketing_agent` | Campaign preparation and audience eligibility | Draft copy, consent-aware audience preparation, preview | Planner may assign; no broadcast is sent. Existing consent/opt-out campaign routes remain authoritative. |
| `operations_agent` | Placements, arrivals, contractors, and tasks | Arrival status, incomplete tasks, daily operational summary | Planner may assign; live facts require later scoped tools. |
| `interview_agent` | Interview coordination | Interview status, schedule preparation, notification drafts | Planner may assign; bookings are not created or modified. |
| `analytics_agent` | Management reporting | Applicant, employer, interview, campaign, automation, and operations reports | Planner may assign; no statistics are generated until connected to authorized records. |

## Planner contract

The Worker accepts only these IDs in structured model output. It rejects unknown agent IDs, missing task/reason text, more than six steps, and dependencies that refer to the same or a future step. The plan contains an intent type, summary, ordered steps, approval-required flag, and optional clarification question.

The planner returns a draft and records `executed: false`. `GET /api/ai-command-center/agents` lists static agent configuration with `planning_only` status and each agent's registered read-only tools. It does not manufacture availability, recent activity, or execution history. An agent ID is a routing label, not a permission grant. `GET /api/ai-command-center/tools` returns the server-side allowlist; `POST /api/ai-command-center/tools/:toolName/execute` validates and dispatches a registered read-only tool under authenticated agency scope. The only registered planner tool is `search_approved_knowledge`; it does not search applicant or employer records. Operational reads and writes in the chat use distinct authenticated Worker paths. Chat context is bounded, and uploaded applicant document contents are not read. External messaging and other supported changes depend on the existing website authorization and still require staff confirmation in chat.
