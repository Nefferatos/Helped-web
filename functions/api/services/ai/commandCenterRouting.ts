/**
 * Keep general conversation on the fast conversational model. Make is reserved
 * for requests that need agency records or may create/change/send something.
 */
export const requiresMakeCommandCenterAgent = (message: string): boolean => {
  const text = message.trim();
  if (!text) return false;

  const isInformational = /\b(?:how\s+(?:do|can|should)\s+i|how\s+to|what\s+can\s+you\s+do|can\s+you\s+explain|please\s+explain|explain|what\s+is|tell\s+me\s+about)\b/i.test(text);
  const asksForSpecificRecordsOrAction = /\b(?:my|our|show|find|search|list|look up|latest|recent|status|count|how many|send|schedule|book|create|add|update|edit|delete|remove|change|enable|disable|turn on|turn off|approve|reject|assign|launch|publish|reply to|respond to|import|upload|reschedule|cancel)\b/i.test(text);
  if (isInformational && !asksForSpecificRecordsOrAction) return false;

  const asksForAgencyRecords = /\b(?:applicants?|employers?|maids?|helpers?|referrals?|enquir(?:y|ies)|inquir(?:y|ies)|placements?|contracts?|interviews?|agency requests?|client requests?|customer chats?|website chats?|agency messages?|whatsapp|telegram|broadcasts?|campaigns?|recipient lists?|opted.?in contacts?|approved agency policies|knowledge library|agency dashboard records?)\b/i.test(text);
  const asksToChangeAgencyState = /\b(?:send|schedule|book|create|add|update|edit|delete|remove|change|enable|disable|turn on|turn off|approve|reject|assign|launch|publish|reply to|respond to|auto.?reply|automatic replies?|import|upload|reschedule|cancel)\b/i.test(text) &&
    /\b(?:agency|website|dashboard|applicant|employer|maid|helper|referral|enquir(?:y|ies)|request|message|chat|customer|placement|interview|broadcast|campaign|whatsapp|telegram|contact|record|profile|automation|auto.?reply|schedule)\b/i.test(text);

  return asksForAgencyRecords || asksToChangeAgencyState;
};
