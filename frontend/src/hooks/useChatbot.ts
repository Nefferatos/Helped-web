import type {
  AgencyChatbotConfig,
  AgencyChatbotTopicOption,
  ChatMessage,
} from "@/lib/chat";

export const BOT_TYPING_DELAY_MIN = 900;
export const BOT_TYPING_DELAY_MAX = 1800;

const firstName = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";

const fillTemplate = (
  template: string,
  context: { name: string; agencyName: string; message: string },
) =>
  template
    .replaceAll("{{name}}", context.name)
    .replaceAll("{{agencyName}}", context.agencyName)
    .replaceAll("{{message}}", context.message);

const typingDelay = (text: string): number => {
  const base = BOT_TYPING_DELAY_MIN;
  const extra = Math.min(text.length * 8, BOT_TYPING_DELAY_MAX - base);
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

const containsAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const buildReceptionistResponse = (
  text: string,
  context: { name: string; agencyName: string; message: string },
) => {
  const lower = normalize(text);
  const shortName = context.name;

  if (isGreetingOnlyMessage(text)) {
    return `Hi ${shortName}, welcome to ${context.agencyName}. How can I help you today?`;
  }

  if (containsAny(lower, [/(thank you|thanks|appreciate it)/])) {
    return `You're most welcome, ${shortName}. If you'd like, you can send me the next detail here and I'll help you from there.`;
  }

  if (containsAny(lower, [/(price|pricing|cost|budget|fee|fees|salary|invoice|payment)/])) {
    return `Of course, ${shortName}. I can help with that. Please send the profile, invoice, or fee item you're referring to, and I'll help narrow down what the team needs to check.`;
  }

  if (containsAny(lower, [/(schedule|reschedule|appointment|interview|date|time|slot|availability)/])) {
    return `Sure, ${shortName}. Please let me know the date or timing you have in mind, and if there is a specific helper or interview this is about, include that too so I can guide the next step clearly.`;
  }

  if (containsAny(lower, [/(status|progress|update|follow up|follow-up|application|placement)/])) {
    return `Certainly, ${shortName}. I can help you follow that up. Please send the helper name, reference number, or request details, and I'll help prepare it properly for the team.`;
  }

  if (containsAny(lower, [/(document|documents|paperwork|permit|requirement|checklist)/])) {
    return `No problem, ${shortName}. Please tell me whether this is for a new hire, transfer, or renewal, and I can point you to the right documents or next step.`;
  }

  if (containsAny(lower, [/(issue|problem|concern|complaint|urgent|not happy)/])) {
    return `I'm sorry to hear that, ${shortName}. Please tell me briefly what happened and when it happened, and I'll help make sure your message is clear and properly routed.`;
  }

  return `Hi ${shortName}, thanks for your message. Please share a little more detail about what you need help with, and I'll guide you on the next step.`;
};

const isGreetingOnlyMessage = (text: string) => {
  const cleaned = normalize(text).replace(/[!,.?]+/g, "").trim();
  return GREETING_WORDS.some((word) => cleaned === word);
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

const buildTopicAwareFallback = (
  topic: AgencyChatbotTopicOption,
  context: { name: string; agencyName: string; message: string },
) => {
  const intent = detectTopicIntent(topic);

  switch (intent) {
    case "placement":
      return `Hi ${context.name}, certainly. If you send me the request details, helper name, or reference number, I'll help you follow up on the ${topic.label.toLowerCase()} update.`;
    case "schedule":
      return `Hi ${context.name}, no problem. Please share the date or timing you'd like to change, and if this is tied to a specific interview or arrangement, include that too.`;
    case "billing":
      return `Hi ${context.name}, of course. Please send the invoice, payment, or fee detail you'd like checked, and I'll guide what to include for the team.`;
    case "concern":
      return `Hi ${context.name}, I'm sorry to hear that. Please tell me what happened, and if possible when it happened, and I'll help you put it across clearly for follow-up.`;
    case "renewal":
      return `Hi ${context.name}, certainly. Please send the contract or renewal details you'd like to check, and I'll help with the next step from there.`;
    case "documents":
      return `Hi ${context.name}, happy to help. Please let me know which document or requirement you're checking on, and whether this is for a new hire, transfer, or renewal.`;
    default:
      return `Hi ${context.name}, I can help with ${topic.label.toLowerCase()}. Send me a little more detail and I'll guide you on what to say next.`;
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
      if (topicKeywords.some((part) => cleaned.includes(part) || part.includes(cleaned))) {
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

  if (options?.selectedTopic) {
    const topicText = buildTopicAwareFallback(options.selectedTopic, context);
    return { text: topicText, delay: typingDelay(topicText) };
  }

  const receptionistReply = buildReceptionistResponse(trimmed, context);
  if (receptionistReply) {
    return { text: receptionistReply, delay: typingDelay(receptionistReply) };
  }

  const fallbackTemplate =
    trimmed.length < 20 ? config.fallbackShortResponse : config.fallbackLongResponse;
  const fallbackText = fillTemplate(fallbackTemplate, context);
  return { text: fallbackText, delay: typingDelay(fallbackText) };
}
