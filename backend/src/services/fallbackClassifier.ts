export type DeterministicWorkflow =
  | 'inquiry_match'
  | 'contract_creation'
  | 'schedule_creation'
  | 'notification_only'
  | 'human_review'
  | 'inquiry_only'

const INQUIRY_MATCH_PATTERN =
  /\b(hire|nanny|maid|housemaid|infant care|childcare|babysitter|recommend|shortlist|match)\b/i
const CONTRACT_PATTERN =
  /\b(contract|generate contract|create contract|draft contract)\b/i
const SCHEDULE_PATTERN =
  /\b(schedule|interview|appointment|book|arrange meeting|confirm interview)\b/i
const NOTIFICATION_PATTERN =
  /\b(notify|send message|reminder|send email|send sms)\b/i
const HUMAN_REVIEW_PATTERN =
  /\b(complaint|refund|angry|issue|problem|bad service|disappointed|manager|escalation|escalate|dispute)\b/i

export const classifyFallback = (message: string): { workflow: DeterministicWorkflow } => {
  const text = message.trim()

  if (CONTRACT_PATTERN.test(text)) {
    return { workflow: 'contract_creation' }
  }

  if (SCHEDULE_PATTERN.test(text)) {
    return { workflow: 'schedule_creation' }
  }

  if (NOTIFICATION_PATTERN.test(text)) {
    return { workflow: 'notification_only' }
  }

  if (HUMAN_REVIEW_PATTERN.test(text)) {
    return { workflow: 'human_review' }
  }

  if (INQUIRY_MATCH_PATTERN.test(text)) {
    return { workflow: 'inquiry_match' }
  }

  return { workflow: 'inquiry_only' }
}
