# Maid Agency Backend Workflow List

## Canonical workflow assignments

These are the workflow names used by the backend workflow system:

- `inquiry_match`
- `make_pipeline`
- `inquiry_only`
- `lead_scoring`
- `contract_creation`
- `schedule_creation`
- `notification_only`
- `validation_error`
- `human_review`

## Legacy workflow aliases

Old workflow labels are normalized to canonical names in `backend/src/services/workflowNameService.ts`:

- `maid_matching` → `inquiry_match`
- `general_inquiry` → `inquiry_only`
- `inquiry` → `inquiry_only`

## Workflow AI agents and services

The backend workflow AI logic is implemented primarily in these files:

### `backend/src/services/workflowAiService.ts`

- `enrichLeadWithAi(payload)`
  - extracts lead details from text
  - returns `serviceType`, `budget`, `urgency`, `location`, `summary`
- `qualifyLeadWithAi(payload)`
  - scores a lead and classifies it as `HIGH`/`MEDIUM`/`LOW`
- `classifyInquiryWithAi(payload)`
  - classifies an inquiry into `intent` and `workflow`
  - valid workflows are the canonical workflow assignments above
- `rankMatchesWithAi(criteria, candidates)`
  - ranks maid match candidates using AI if available
- `generateContractDraftWithAi(payload)`
  - drafts a contract text and summary from hiring details

### `backend/src/agents/matchingAgent.ts`

- `runSemanticMatchingAgent(criteria)`
  - retrieves semantic maid candidates
  - applies compliance and matching rules
  - uses `rankMatchesWithAi` to score and rank the top matches

### `backend/src/services/aiOrchestratorService.ts`

- `processInquiryWithAiOrchestrator(payload)`
  - orchestrates inquiry classification and matching
  - logs workflow steps for `inquiry_pipeline`
  - returns the final workflow, reply and matches

### `backend/src/services/workflowOrchestrationService.ts`

These functions use the AI services to run workflow pipelines.

- `processRawLead(payload)`
  - enriches the lead with AI
  - qualifies the lead with AI
  - stores the lead and sends internal notifications
- `processInquiryWorkflow(payload)`
  - forwards to `processInquiryWithAiOrchestrator`
- `runDirectMatchingWorkflow(criteria)`
  - forwards to `runMatchingWorkflow`
- `scheduleInterviewWorkflow(payload)`
  - stores interview schedule and sends notifications
- `generateContractWorkflow(payload)`
  - creates a contract using `generateContractDraftWithAi`
- `sendNotificationWorkflow(payload)`
  - sends workflow notifications and logs them
- `sendMessageWorkflow(payload)`
  - wraps notification sending for direct messaging
- `sendWorkflowToMake(payload)`
  - triggers a Make webhook and logs the action

## Important workflow-related files to inspect

- `backend/src/types/workflow.ts`
- `backend/src/services/workflowNameService.ts`
- `backend/src/services/workflowAiService.ts`
- `backend/src/agents/matchingAgent.ts`
- `backend/src/services/aiOrchestratorService.ts`
- `backend/src/services/workflowOrchestrationService.ts`
- `backend/src/services/workflowMatchingService.ts`

## Notes

- The workflow system is AI-assisted for classification, lead enrichment, lead qualification, match ranking, and contract drafting.
- The canonical workflows are enforced in `workflowNameService.ts` and are the source of truth for valid workflow names.
