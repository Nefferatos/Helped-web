/**
 * Sample Test Data for Enquiry Extraction System
 * Test cases for the Helped Maids enquiry intake assistant
 */

export const SAMPLE_ENQUIRIES = [
  {
    id: 1,
    name: "Simple Family Enquiry",
    raw: `Hello, we are a family of 4 looking for a live-in domestic helper. 
    We need someone who can do general housekeeping and cooking. 
    Budget is around SGD 800-900 per month. Start date should be next month.
    Preferably Philippine nationality. Please let me know available candidates.`,
    expected: {
      employer_summary:
        "Family of 4 seeking live-in domestic helper for housekeeping and cooking at SGD 800-900/month.",
      requirements: {
        nationality_preference: "philippine",
        live_in_out: "Live-in",
        budget_band: "800-900",
        start_date: "next month",
        household_size: "4 members",
        other_notes: "general housekeeping; cooking",
      },
      urgency: "Medium",
      suggested_tags: ["Live-in", "philippine", "Housekeeping", "Cooking"],
    },
  },
  {
    id: 2,
    name: "Urgent Elderly Care",
    raw: `URGENT - Need caregivers ASAP. My mother is 82 years old and requires 
    24-hour care. We need a live-in maid who has experience with elderly care.
    Budget is flexible, no more than SGD 2000/month. Can start immediately.
    Must be reliable and compassionate. Any nationality is fine.`,
    expected: {
      employer_summary:
        "Urgent need for 24-hour elderly care for 82-year-old. Live-in arrangement with flexible budget up to SGD 2000/month.",
      requirements: {
        nationality_preference: "No preference",
        live_in_out: "Live-in",
        budget_band: "2000",
        start_date: "immediately",
        household_size: null,
        other_notes: "experience with elderly care; reliable and compassionate",
      },
      urgency: "High",
      suggested_tags: ["Urgent", "Live-in", "Elderly-care", "Premium"],
    },
  },
  {
    id: 3,
    name: "Childcare Only",
    raw: `Looking for a part-time maid for childcare only (live-out). 
    I have 2 children aged 4 and 7. Need someone Monday to Friday, 3-6pm.
    Not urgent, flexible on start date. Budget is SGD 300-400/month.
    Prefer someone with nanny experience.`,
    expected: {
      employer_summary:
        "Part-time childcare (live-out) for 2 children aged 4-7, Monday-Friday 3-6pm at SGD 300-400/month.",
      requirements: {
        nationality_preference: null,
        live_in_out: "Live-out",
        budget_band: "300-400",
        start_date: null,
        household_size: "2 members",
        other_notes: "nanny experience",
      },
      urgency: "Low",
      suggested_tags: ["Non-urgent", "Live-out", "Childcare", "Budget"],
    },
  },
  {
    id: 4,
    name: "Multi-requirement High Budget",
    raw: `Executive household seeking premium maid service. 
    We need a professional live-in maid with the following requirements:
    - Cooking expertise (Asian and Western cuisine)
    - Housekeeping and laundry management
    - Childcare for 1 infant
    - Elderly care for grandmother (60s)
    Budget: SGD 2500-3000/month. Start date: 1st September 2024.
    Indonesian nationality preferred. Must have proven track record.`,
    expected: {
      employer_summary:
        "Premium live-in maid position combining cooking, housekeeping, childcare, and elderly care at SGD 2500-3000/month.",
      requirements: {
        nationality_preference: "indonesian",
        live_in_out: "Live-in",
        budget_band: "2500-3000",
        start_date: "1st September 2024",
        household_size: null,
        other_notes:
          "cooking expertise; housekeeping and laundry; childcare for infant; elderly care",
      },
      urgency: "Medium",
      suggested_tags: [
        "Live-in",
        "indonesian",
        "Premium",
        "Cooking",
        "Childcare",
      ],
    },
  },
  {
    id: 5,
    name: "Flexible Arrangement",
    raw: `We are open to either live-in or live-out arrangement, whatever works best.
    Main job is to help with household cleaning and meal prep.
    We are a couple, no children or elderly to care for.
    Happy to accommodate any nationality.
    Not in a rush - can start anytime in the next 2 months.
    Budget: around SGD 600/month.`,
    expected: {
      employer_summary:
        "Flexible live-in or live-out maid for household cleaning and meal prep for a couple at SGD 600/month.",
      requirements: {
        nationality_preference: "No preference",
        live_in_out: "Flexible",
        budget_band: "600",
        start_date: "2 months",
        household_size: null,
        other_notes: "household cleaning; meal preparation",
      },
      urgency: "Low",
      suggested_tags: ["Non-urgent", "Flexible", "Housekeeping", "Cooking"],
    },
  },
];

/**
 * Run extraction tests
 */
export async function testEnquiryExtraction() {
  const { extractEnquiry } = await import("../lib/enquiryExtractor");

  console.log("=== Enquiry Extraction System Test Suite ===\n");

  let passCount = 0;
  let failCount = 0;

  for (const testCase of SAMPLE_ENQUIRIES) {
    console.log(`Test ${testCase.id}: ${testCase.name}`);
    console.log("-".repeat(50));

    try {
      const extracted = extractEnquiry(testCase.raw);

      console.log("Extracted Summary:", extracted.employer_summary);
      console.log(
        "Nationality:",
        extracted.requirements.nationality_preference,
      );
      console.log("Live-in/out:", extracted.requirements.live_in_out);
      console.log("Budget:", extracted.requirements.budget_band);
      console.log("Start Date:", extracted.requirements.start_date);
      console.log("Household Size:", extracted.requirements.household_size);
      console.log("Urgency:", extracted.urgency);
      console.log("Tags:", extracted.suggested_tags.join(", "));
      console.log("JSON:\n", JSON.stringify(extracted, null, 2));

      passCount++;
    } catch (error) {
      console.error(
        "ERROR:",
        error instanceof Error ? error.message : String(error),
      );
      failCount++;
    }

    console.log("\n");
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passCount}/${SAMPLE_ENQUIRIES.length}`);
  console.log(`Failed: ${failCount}/${SAMPLE_ENQUIRIES.length}`);

  return { passCount, failCount };
}

/**
 * Format enquiry for API response
 */
export function formatEnquiryResponse(extracted: any) {
  return {
    status: "success",
    data: extracted,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch extract multiple enquiries
 */
export async function batchExtractEnquiries(rawEnquiries: string[]) {
  const { extractEnquiry } = await import("../lib/enquiryExtractor");

  return rawEnquiries.map((raw, index) => ({
    id: index + 1,
    extracted: extractEnquiry(raw),
    timestamp: new Date().toISOString(),
  }));
}
