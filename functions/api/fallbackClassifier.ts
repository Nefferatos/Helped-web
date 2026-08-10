// fallbackClassifier.ts
// Deterministic keyword-based workflow classifier used as a fast-path fallback
// before (or instead of) the AI classifier.
//
// FIXES applied:
//  1. DeterministicWorkflow now includes all values present in CANONICAL_WORKFLOWS
//     so normalizeWorkflow() in the server never throws INVALID_WORKFLOW for a
//     fallback-produced value.
//  2. Pattern priority reordered: inquiry_match (the most common intent) is
//     checked FIRST so that a message like "hire contract" routes to inquiry_match
//     rather than accidentally falling through to contract_creation.

export type DeterministicWorkflow =
  | "inquiry_match"
  | "make_pipeline"
  | "contract_creation"
  | "schedule_creation"
  | "notification_only"
  | "human_review"
  | "inquiry_only"
  | "lead_scoring" // added - present in CANONICAL_WORKFLOWS
  | "validation_error"; // added - present in CANONICAL_WORKFLOWS

const INQUIRY_MATCH_PATTERN =
  /\b(hire|nanny|maid|housemaid|infant care|childcare|babysitter|recommend|shortlist|match)\b/i;
const CONTRACT_PATTERN =
  /\b(contract|generate contract|create contract|draft contract)\b/i;
const SCHEDULE_PATTERN =
  /\b(schedule|interview|appointment|book|arrange meeting|confirm interview)\b/i;
const NOTIFICATION_PATTERN =
  /\b(notify|send message|reminder|send email|send sms)\b/i;
const HUMAN_REVIEW_PATTERN =
  /\b(complaint|refund|angry|issue|problem|bad service|disappointed|manager|escalation|escalate|dispute)\b/i;

export const classifyFallback = (
  message: string,
): { workflow: DeterministicWorkflow } => {
  const text = message.trim();

  // FIX: inquiry_match is checked FIRST.
  // Previously it was the last check, so messages like "hire contract" would
  // incorrectly route to contract_creation instead of inquiry_match.
  if (INQUIRY_MATCH_PATTERN.test(text)) {
    return { workflow: "inquiry_match" };
  }

  if (HUMAN_REVIEW_PATTERN.test(text)) {
    return { workflow: "human_review" };
  }

  if (CONTRACT_PATTERN.test(text)) {
    return { workflow: "contract_creation" };
  }

  if (SCHEDULE_PATTERN.test(text)) {
    return { workflow: "schedule_creation" };
  }

  if (NOTIFICATION_PATTERN.test(text)) {
    return { workflow: "notification_only" };
  }

  return { workflow: "inquiry_only" };
};
