import type {
  AgencyChatbotConfig,
  AgencyChatbotTopicOption,
  ChatMessage,
} from "@/lib/chat";

export const BOT_TYPING_DELAY_MIN = 600;
export const BOT_TYPING_DELAY_MAX = 1200;

const firstName = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";

const fillTemplate = (
  template: string,
  context: { name: string; agencyName: string; message: string },
) =>
  template
    .split("{{name}}").join(context.name)
    .split("{{agencyName}}").join(context.agencyName)
    .split("{{message}}").join(context.message);

// Shorter delay — Facebook replies feel near-instant
const typingDelay = (text: string): number => {
  const base = BOT_TYPING_DELAY_MIN;
  const extra = Math.min(text.length * 5, BOT_TYPING_DELAY_MAX - base);
  return base + extra;
};

const normalize = (value: string) => value.trim().toLowerCase();
const tokenize = (value: string) =>
  normalize(value)
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);

const GREETING_WORDS = [
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "howdy",
  "hiya",
];

const containsAny = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

const pickVariant = (options: string[], seedText: string) =>
  options[Math.abs(seedText.length + seedText.split(/\s+/).length) % options.length] ||
  options[0];

const getRecentMessages = (history?: ChatMessage[], count = 6) =>
  (history ?? []).slice(-count);

const getLastAgencyMessage = (history?: ChatMessage[]) => {
  const recent = getRecentMessages(history, 10);
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    if (recent[index].senderRole === "agency") return recent[index];
  }
  return null;
};

const mentionsReferenceInfo = (text: string) =>
  /(reference|ref no|request id|application id|helper name|maid name|invoice number|invoice no)/i.test(
    text,
  );

// ─── Facebook-style: short, warm, acknowledge first, one ask at the end ───────

const isGreetingOnlyMessage = (text: string) => {
  const cleaned = normalize(text).replace(/[!,.?]+/g, "").trim();
  return GREETING_WORDS.some((word) => cleaned === word);
};

/**
 * Core response builder.
 *
 * Facebook Business Page feel:
 *  1. Acknowledge immediately ("Got it!", "Thanks for reaching out!")
 *  2. Signal a human handoff ("I've flagged this with our team.")
 *  3. Ask ONE follow-up question at most — never interrogate.
 *  4. Keep it short: 1–2 sentences max.
 *  5. One emoji max per message, placed naturally.
 */
const buildReceptionistResponse = (
  text: string,
  context: { name: string; agencyName: string; message: string },
  history?: ChatMessage[],
): string => {
  const lower = normalize(text);
  const shortName = context.name;
  const lastAgencyMessage = getLastAgencyMessage(history);
  const hasWelcomedRecently =
    !!lastAgencyMessage &&
    /(welcome to|how can i help you today|how may i assist you today)/i.test(
      lastAgencyMessage.message,
    );
  const hasReference = mentionsReferenceInfo(text);

  // ── Greeting ────────────────────────────────────────────────────────────────
  if (isGreetingOnlyMessage(text)) {
    return hasWelcomedRecently
      ? pickVariant(
          [
            `Hey ${shortName}! 😊 What can I help you with?`,
            `Hi ${shortName}! Go ahead, I'm listening.`,
            `Hello ${shortName}! What would you like to check today?`,
          ],
          text,
        )
      : `Hi ${shortName}! Thanks for reaching out to ${context.agencyName}. How can I help you today? 😊`;
  }

  // ── Thank you ────────────────────────────────────────────────────────────────
  if (containsAny(lower, [/(thank you|thanks|appreciate it)/])) {
    return pickVariant(
      [
        `You're welcome, ${shortName}! Feel free to message us anytime. 😊`,
        `Happy to help, ${shortName}! Don't hesitate to reach out if you need anything else.`,
        `Of course, ${shortName}! We're always here if you need us.`,
      ],
      text,
    );
  }

  // ── Billing / Invoice / Fees ─────────────────────────────────────────────────
  if (
    containsAny(lower, [/(price|pricing|cost|budget|fee|fees|salary|invoice|payment)/])
  ) {
    return hasReference
      ? pickVariant(
          [
            `Got it, ${shortName}! I've flagged your billing query with our team. They'll get back to you shortly.`,
            `Thanks, ${shortName}! I've passed that on to our team and they'll follow up with you soon.`,
          ],
          text,
        )
      : `Got it, ${shortName}! I've noted your billing question. Could you share the invoice number or helper name so our team can check it faster? 🙏`;
  }

  // ── Scheduling / Appointments ────────────────────────────────────────────────
  if (
    containsAny(lower, [
      /(schedule|reschedule|appointment|interview|date|time|slot|availability)/,
    ])
  ) {
    return hasReference
      ? `Sure, ${shortName}! I've noted your scheduling request and flagged it with the team. They'll confirm with you soon.`
      : `Sure, ${shortName}! Could you share your preferred date or timing? I'll pass it to the team right away. 📅`;
  }

  // ── Status / Follow-up / Placement ──────────────────────────────────────────
  if (
    containsAny(lower, [
      /(status|progress|update|follow up|follow-up|application|placement)/,
    ])
  ) {
    return hasReference
      ? `Thanks, ${shortName}! I've flagged your follow-up with the team. They'll update you as soon as possible. 🙏`
      : `Hi ${shortName}! I've noted your follow-up request. Could you share the helper name or reference number so the team can locate it faster?`;
  }

  // ── Documents / Permits ──────────────────────────────────────────────────────
  if (
    containsAny(lower, [/(document|documents|paperwork|permit|requirement|checklist)/])
  ) {
    return hasReference
      ? `Got it, ${shortName}! I've flagged your document query with the team. They'll get back to you shortly.`
      : `Hi ${shortName}! Is this for a new hire, transfer, or renewal? That'll help us point you to the right requirements quickly.`;
  }

  // ── Concern / Complaint / Urgent ─────────────────────────────────────────────
  if (
    containsAny(lower, [/(issue|problem|concern|complaint|urgent|not happy)/])
  ) {
    return hasReference
      ? `I'm sorry to hear that, ${shortName}. I've flagged this with our team right away. Someone will follow up with you shortly. 🙏`
      : `Hi ${shortName}, I'm sorry about that. Could you briefly share what happened? I'll flag it to our team immediately.`;
  }

  // ── Generic fallback ─────────────────────────────────────────────────────────
  return pickVariant(
    [
      `Thanks for your message, ${shortName}! I've passed this to our team and they'll get back to you soon.`,
      `Got it, ${shortName}! Our team has been notified and will follow up with you shortly. 🙏`,
      `Hi ${shortName}! I've noted your message. Could you share a bit more detail so we can help you faster?`,
    ],
    text,
  );
};

const detectTopicIntent = (topic?: AgencyChatbotTopicOption | null) => {
  const haystack = normalize(
    `${topic?.id ?? ""} ${topic?.label ?? ""} ${topic?.description ?? ""} ${topic?.suggestedMessage ?? ""}`,
  );
  if (/(placement|status|application|progress|update)/.test(haystack)) return "placement";
  if (/(schedule|reschedule|appointment|timing|date|interview)/.test(haystack)) return "schedule";
  if (/(billing|invoice|payment|fee|fees|price|cost)/.test(haystack)) return "billing";
  if (/(concern|issue|complaint|problem|urgent|escalat)/.test(haystack)) return "concern";
  if (/(renew|renewal|contract|extend|extension)/.test(haystack)) return "renewal";
  if (/(document|paperwork|permit|requirement)/.test(haystack)) return "documents";
  return "general";
};

/**
 * Topic-aware fallback — same Facebook Business feel.
 * Acknowledge → handoff signal → one optional ask.
 */
const buildTopicAwareFallback = (
  topic: AgencyChatbotTopicOption,
  context: { name: string; agencyName: string; message: string },
  history?: ChatMessage[],
): string => {
  const intent = detectTopicIntent(topic);
  const lastAgencyMessage = getLastAgencyMessage(history);
  const alreadyHelping =
    lastAgencyMessage &&
    /noted|flagged|passed|happy to help|of course|certainly/i.test(
      lastAgencyMessage.message,
    );

  // Lead-in: vary so it doesn't feel scripted
  const lead = alreadyHelping
    ? pickVariant(["Sure!", "Of course!", "Got it!"], context.message)
    : `Hi ${context.name}!`;

  switch (intent) {
    case "placement":
      return `${lead} I've flagged your ${topic.label.toLowerCase()} enquiry with our team. Could you share the helper name or reference number so they can locate it faster?`;

    case "schedule":
      return `${lead} I've noted your scheduling request. Could you share your preferred date or timing? Our team will confirm availability shortly. 📅`;

    case "billing":
      return `${lead} I've passed your billing query to our team. Got an invoice number or fee detail to share? That'll help them respond faster.`;

    case "concern":
      return `${lead} I'm sorry you're experiencing this. I've flagged it with our team right away. Could you briefly describe what happened? 🙏`;

    case "renewal":
      return `${lead} I've noted your renewal enquiry and flagged it with the team. They'll guide you through the next steps shortly.`;

    case "documents":
      return `${lead} I've passed your document query to the team. Is this for a new hire, transfer, or renewal? That'll help narrow it down quickly.`;

    default:
      return `${lead} I've noted your message about ${topic.label.toLowerCase()} and flagged it with the team. They'll get back to you soon. 🙏`;
  }
};

export function getBotReply(
  clientText: string,
  config: AgencyChatbotConfig,
  options?: {
    clientName?: string | null;
    agencyName?: string | null;
    history?: ChatMessage[];
    selectedTopic?: AgencyChatbotTopicOption | null;
  },
): { text: string; delay: number } | null {
  if (!config.enabled) return null;

  const trimmed = clientText.trim();
  const name = firstName(options?.clientName);
  const agencyName = (options?.agencyName ?? "").trim() || "our agency";
  const context = { name, agencyName, message: trimmed };
  const normalizedText = normalize(trimmed);
  const topicKeywords = options?.selectedTopic
    ? tokenize(
        `${options.selectedTopic.id} ${options.selectedTopic.label} ${options.selectedTopic.description} ${options.selectedTopic.suggestedMessage}`,
      )
    : [];

  // ── Custom rules from config (agency-defined) ────────────────────────────────
  let bestMatch: { text: string; score: number } | null = null;

  for (const rule of config.responseRules) {
    if (!rule.enabled) continue;

    const isGreetingRule =
      normalize(rule.id) === "greeting" ||
      rule.keywords.some((keyword) => GREETING_WORDS.includes(normalize(keyword)));

    if (isGreetingRule && !isGreetingOnlyMessage(trimmed)) {
      continue;
    }

    for (const keyword of rule.keywords) {
      const cleaned = normalize(keyword);
      if (!cleaned || !normalizedText.includes(cleaned)) continue;

      let score = isGreetingRule ? 1 : cleaned.length;
      if (
        topicKeywords.some(
          (part) => cleaned.includes(part) || part.includes(cleaned),
        )
      ) {
        score += 12;
      }
      const text = fillTemplate(rule.response, context);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { text, score };
      }
    }
  }

  if (bestMatch) {
    return { text: bestMatch.text, delay: typingDelay(bestMatch.text) };
  }

  // ── Topic-aware fallback ─────────────────────────────────────────────────────
  if (options?.selectedTopic) {
    const topicText = buildTopicAwareFallback(
      options.selectedTopic,
      context,
      options.history,
    );
    return { text: topicText, delay: typingDelay(topicText) };
  }

  // ── Receptionist fallback ────────────────────────────────────────────────────
  const receptionistReply = buildReceptionistResponse(
    trimmed,
    context,
    options?.history,
  );
  if (receptionistReply) {
    return { text: receptionistReply, delay: typingDelay(receptionistReply) };
  }

  // ── Config fallback (last resort) ────────────────────────────────────────────
  const fallbackTemplate =
    trimmed.length < 20
      ? config.fallbackShortResponse
      : config.fallbackLongResponse;
  const fallbackText = fillTemplate(fallbackTemplate, context);
  return { text: fallbackText, delay: typingDelay(fallbackText) };
}