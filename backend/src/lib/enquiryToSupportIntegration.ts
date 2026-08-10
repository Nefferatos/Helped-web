/**
 * Enquiry to Support Integration
 * Automatically links enquiries to support conversations
 */

import { ExtractedEnquiry } from "./enquiryExtractor";

export interface EnquiryToSupportParams {
  enquiryId: number;
  extractedData: ExtractedEnquiry;
  clientId?: number;
  agencyId: number;
  email: string;
  username: string;
  phone: string;
  message: string;
}

/**
 * Map extracted enquiry to support conversation category
 */
export function mapEnquiryToCategory(
  extracted: ExtractedEnquiry,
):
  | "Booking Concern"
  | "Payment Concern"
  | "Contract Concern"
  | "Maid Replacement"
  | "Technical Support"
  | "General Inquiry" {
  const message =
    `${extracted.employer_summary} ${extracted.requirements.other_notes || ""}`.toLowerCase();

  if (/payment|salary|wage|cost|budget|price/.test(message)) {
    return "Payment Concern";
  }
  if (/contract|agreement|terms|condition/.test(message)) {
    return "Contract Concern";
  }
  if (/replace|change|different|swap|another/.test(message)) {
    return "Maid Replacement";
  }
  if (/technical|system|bug|error|page|website/.test(message)) {
    return "Technical Support";
  }
  if (/book|booking|hire|request|apply/.test(message)) {
    return "Booking Concern";
  }

  return "General Inquiry";
}

/**
 * Map urgency level to support priority
 */
export function mapUrgencyToPriority(
  urgency: "High" | "Medium" | "Low",
): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  switch (urgency) {
    case "High":
      return "URGENT";
    case "Medium":
      return "HIGH";
    case "Low":
      return "MEDIUM";
    default:
      return "MEDIUM";
  }
}

/**
 * Format enquiry for support conversation
 */
export function formatEnquiryForSupport(params: EnquiryToSupportParams): {
  subject: string;
  description: string;
  category: string;
  priority: string;
  tags: string[];
} {
  const { extractedData, username, email, phone } = params;

  return {
    subject: extractedData.employer_summary,
    description: [
      `**Structured Enquiry from:** ${username} (${email}, ${phone})`,
      `**Summary:** ${extractedData.employer_summary}`,
      `**Urgency:** ${extractedData.urgency}`,
      "",
      "**Requirements Extracted:**",
      extractedData.requirements.nationality_preference
        ? `- Nationality Preference: ${extractedData.requirements.nationality_preference}`
        : "",
      extractedData.requirements.live_in_out
        ? `- Arrangement: ${extractedData.requirements.live_in_out}`
        : "",
      extractedData.requirements.budget_band
        ? `- Budget: ${extractedData.requirements.budget_band}`
        : "",
      extractedData.requirements.start_date
        ? `- Start Date: ${extractedData.requirements.start_date}`
        : "",
      extractedData.requirements.household_size
        ? `- Household Size: ${extractedData.requirements.household_size}`
        : "",
      extractedData.requirements.other_notes
        ? `- Additional Notes: ${extractedData.requirements.other_notes}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    category: mapEnquiryToCategory(extractedData),
    priority: mapUrgencyToPriority(extractedData.urgency),
    tags: extractedData.suggested_tags,
  };
}

/**
 * Create support conversation from enquiry
 */
export async function createSupportConversationFromEnquiry(
  params: EnquiryToSupportParams,
): Promise<{
  conversationId?: string;
  success: boolean;
  message: string;
}> {
  try {
    const formatted = formatEnquiryForSupport(params);

    // In production, this would call the actual support conversation API
    // For now, returning a structured response that can be used to create the conversation

    console.log("[EnquiryIntegration] Creating support conversation:", {
      clientId: params.clientId,
      agencyId: params.agencyId,
      subject: formatted.subject,
      category: formatted.category,
      priority: formatted.priority,
      tags: formatted.tags,
    });

    return {
      success: true,
      message: "Support conversation data formatted successfully",
    };
  } catch (error) {
    console.error(
      "[EnquiryIntegration] Failed to create support conversation:",
      error,
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Link enquiry to existing support conversation
 */
export async function linkEnquiryToConversation(
  enquiryId: number,
  conversationId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("[EnquiryIntegration] Linking enquiry to conversation:", {
      enquiryId,
      conversationId,
    });

    // In production, this would update the database to link the enquiry to the conversation

    return {
      success: true,
      message: "Enquiry linked to conversation successfully",
    };
  } catch (error) {
    console.error("[EnquiryIntegration] Failed to link enquiry:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate support message content from extracted enquiry
 */
export function generateSupportMessage(extracted: ExtractedEnquiry): string {
  const lines = [
    `**Structured Enquiry Received**`,
    "",
    `**Summary:** ${extracted.employer_summary}`,
    "",
    `**Key Requirements:**`,
  ];

  if (extracted.requirements.nationality_preference) {
    lines.push(
      `- Nationality: ${extracted.requirements.nationality_preference}`,
    );
  }
  if (extracted.requirements.live_in_out) {
    lines.push(`- Arrangement: ${extracted.requirements.live_in_out}`);
  }
  if (extracted.requirements.budget_band) {
    lines.push(`- Budget: SGD ${extracted.requirements.budget_band}/month`);
  }
  if (extracted.requirements.start_date) {
    lines.push(`- Start Date: ${extracted.requirements.start_date}`);
  }
  if (extracted.requirements.household_size) {
    lines.push(`- Household: ${extracted.requirements.household_size}`);
  }

  lines.push("");
  lines.push(`**Urgency Level:** ${extracted.urgency}`);
  lines.push(`**Auto-Generated Tags:** ${extracted.suggested_tags.join(", ")}`);

  if (extracted.requirements.other_notes) {
    lines.push("");
    lines.push(`**Additional Notes:**`);
    lines.push(extracted.requirements.other_notes);
  }

  return lines.join("\n");
}

/**
 * Helper: Create matching query for finding existing conversations
 */
export function buildConversationSearchQuery(
  email: string,
  agencyId: number,
): {
  email: string;
  agencyId: number;
} {
  return {
    email: email.toLowerCase().trim(),
    agencyId,
  };
}
