/**
 * Enquiry Intake Extractor
 * Parses raw employer enquiries and extracts structured data
 */

export interface ExtractedEnquiry {
  employer_summary: string;
  requirements: {
    nationality_preference: string | null;
    live_in_out: string | null;
    budget_band: string | null;
    start_date: string | null;
    household_size: string | null;
    other_notes: string | null;
  };
  urgency: "High" | "Medium" | "Low";
  suggested_tags: string[];
}

/**
 * Extract structured enquiry data from raw text
 */
export function extractEnquiry(rawText: string): ExtractedEnquiry {
  const text = rawText.trim();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract employer summary (first 1-2 sentences)
  const summary = extractSummary(text);

  // Extract requirements
  const requirements = {
    nationality_preference: extractNationality(text),
    live_in_out: extractLiveInOut(text),
    budget_band: extractBudget(text),
    start_date: extractStartDate(text),
    household_size: extractHouseholdSize(text),
    other_notes: extractOtherNotes(text),
  };

  // Determine urgency
  const urgency = determineUrgency(text);

  // Generate tags
  const tags = generateTags(requirements, urgency, text);

  return {
    employer_summary: summary,
    requirements,
    urgency,
    suggested_tags: tags,
  };
}

function extractSummary(text: string): string {
  // Get first 1-2 sentences (up to 200 chars)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const summary = sentences.slice(0, 2).join("").trim();
  return summary.substring(0, 200) || text.substring(0, 200);
}

function extractNationality(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Look for specific nationality mentions
  const nationalities = [
    "philippine|philippina|fil",
    "indonesian|indo",
    "myanmar|burmese",
    "thai",
    "indian",
    "bangladeshi|bangladesh",
    "sri lankan|srilanka",
    "nepal|nepali",
    "cambodian",
    "vietnamese|vietnam",
  ];

  for (const nat of nationalities) {
    if (new RegExp(nat).test(lowerText)) {
      return nat.split("|")[0];
    }
  }

  // Check for "no preference" or similar
  if (
    /no.*preference|any nationality|all nationality|does not matter/.test(
      lowerText,
    )
  ) {
    return "No preference";
  }

  return null;
}

function extractLiveInOut(text: string): string | null {
  const lowerText = text.toLowerCase();

  if (/live\s*-?\s*in|live-in|residential/.test(lowerText)) {
    return "Live-in";
  }
  if (
    /live\s*-?\s*out|live-out|daily|part-time|non-residential/.test(lowerText)
  ) {
    return "Live-out";
  }
  if (/flexible|either|both|live in or out/.test(lowerText)) {
    return "Flexible";
  }

  return null;
}

function extractBudget(text: string): string | null {
  // Look for currency amounts
  const currencyPatterns = [
    /(?:sgd|s\$|£|usd|\$|rs|inr)[.\s]*(\d+(?:,?\d+)*)/gi,
    /(\d+(?:,?\d+)*)\s*(?:sgd|s\$|£|usd|\$|rs|inr)/gi,
    /(?:budget|salary|pay|wage|cost).*?(\d+(?:,?\d+)*)\s*(?:to|-|–)\s*(\d+(?:,?\d+)*)/gi,
  ];

  const amounts: number[] = [];
  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num1 = parseInt(match[1]?.replace(/,/g, "") || "0", 10);
      const num2 = match[2] ? parseInt(match[2].replace(/,/g, ""), 10) : null;

      if (num1 > 0) amounts.push(num1);
      if (num2 && num2 > 0) amounts.push(num2);
    }
  }

  if (amounts.length > 0) {
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    if (min === max) {
      return `${min}`;
    }
    return `${min}-${max}`;
  }

  return null;
}

function extractStartDate(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Look for specific date references
  const datePatterns = [
    /start(?:ing)?\s+(?:date|on|from)?\s*(?::)?[\s]*([^,.\n]+)/i,
    /(?:asap|immediately|urgent|right away|immediately|this week|next week)/i,
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1]?.trim();
      if (dateStr && dateStr.length < 50) {
        return dateStr;
      }
    }
  }

  return null;
}

function extractHouseholdSize(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Look for family size mentions
  const sizePatterns = [
    /(?:family|household)\s+(?:of|size)?[\s]*(\d+)/i,
    /(\d+)\s+(?:members?|people|persons?)/i,
    /household[\s]*:[\s]*(\d+)/i,
  ];

  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `${match[1]} members`;
    }
  }

  return null;
}

function extractOtherNotes(text: string): string | null {
  // Look for additional requirements or notes
  const notePatterns = [
    /(?:requirement|prefer|need|must|should|important)[\s]*:?[\s]*([^.!\n]{20,})/gi,
    /(?:note|comment|additional|special|other)[\s]*:?[\s]*([^.!\n]{20,})/gi,
  ];

  const notes: string[] = [];
  for (const pattern of notePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const note = match[1]?.trim();
      if (note && note.length > 10 && notes.length < 3) {
        notes.push(note);
      }
    }
  }

  if (notes.length > 0) {
    return notes.slice(0, 2).join("; ");
  }

  return null;
}

function determineUrgency(text: string): "High" | "Medium" | "Low" {
  const lowerText = text.toLowerCase();

  // High urgency indicators
  if (
    /asap|urgent|immediately|emergency|right away|today|this week|rush/.test(
      lowerText,
    )
  ) {
    return "High";
  }

  // Low urgency indicators
  if (/no rush|flexible|whenever|anytime|not urgent/.test(lowerText)) {
    return "Low";
  }

  // Default to Medium
  return "Medium";
}

function generateTags(
  requirements: ExtractedEnquiry["requirements"],
  urgency: string,
  text: string,
): string[] {
  const tags: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  // Add urgency tag
  if (urgency === "High") tags.add("Urgent");
  if (urgency === "Low") tags.add("Non-urgent");

  // Add live-in/live-out tag
  if (requirements.live_in_out) {
    tags.add(requirements.live_in_out);
  }

  // Add nationality tag if specified
  if (
    requirements.nationality_preference &&
    requirements.nationality_preference !== "No preference"
  ) {
    tags.add(requirements.nationality_preference);
  }

  // Add care type tags
  if (/elder care|elderly|senior|aged|older|care for elderly/.test(lowerText)) {
    tags.add("Elderly-care");
  }
  if (/children|childcare|babysit|nanny|toddler|infant/.test(lowerText)) {
    tags.add("Childcare");
  }
  if (
    /cleaning|housekeeping|domestic|maid|maid.*service|housemaid/.test(
      lowerText,
    )
  ) {
    tags.add("Housekeeping");
  }
  if (/cooking|chef|meal|food preparation/.test(lowerText)) {
    tags.add("Cooking");
  }

  // Add budget indicator
  if (requirements.budget_band) {
    const budget = parseInt(requirements.budget_band.split("-")[0], 10);
    if (budget > 0) {
      if (budget < 500) tags.add("Budget");
      else if (budget > 2000) tags.add("Premium");
    }
  }

  // Convert to array and limit to 5 tags
  return Array.from(tags).slice(0, 5);
}

/**
 * Format enquiry for JSON response
 */
export function formatEnquiryJson(extracted: ExtractedEnquiry): string {
  return JSON.stringify(extracted);
}
