#!/usr/bin/env node

/**
 * Enquiry Extraction Demo Script
 * Run with: npm run demo:enquiry
 */

import { extractEnquiry, formatEnquiryJson } from "./enquiryExtractor";
import { SAMPLE_ENQUIRIES } from "./enquiryTestData";

console.log("\n" + "=".repeat(80));
console.log("HELPED MAIDS - ENQUIRY INTAKE SYSTEM DEMO");
console.log("=".repeat(80) + "\n");

async function runDemo() {
  for (const testCase of SAMPLE_ENQUIRIES) {
    console.log("\n" + "-".repeat(80));
    console.log(`ENQUIRY #${testCase.id}: ${testCase.name}`);
    console.log("-".repeat(80));

    console.log("\n📝 RAW INPUT:");
    console.log(testCase.raw);

    console.log("\n🔍 EXTRACTED DATA:");
    const extracted = extractEnquiry(testCase.raw);

    console.log(`\n✓ Employer Summary:`);
    console.log(`  "${extracted.employer_summary}"`);

    console.log(`\n✓ Requirements:`);
    console.log(
      `  • Nationality:     ${extracted.requirements.nationality_preference || "Not specified"}`,
    );
    console.log(
      `  • Arrangement:     ${extracted.requirements.live_in_out || "Not specified"}`,
    );
    console.log(
      `  • Budget:          ${extracted.requirements.budget_band || "Not specified"}`,
    );
    console.log(
      `  • Start Date:      ${extracted.requirements.start_date || "Not specified"}`,
    );
    console.log(
      `  • Household Size:  ${extracted.requirements.household_size || "Not specified"}`,
    );
    if (extracted.requirements.other_notes) {
      console.log(`  • Other Notes:     ${extracted.requirements.other_notes}`);
    }

    console.log(`\n✓ Urgency Level: ${extracted.urgency}`);
    console.log(`\n✓ Suggested Tags: ${extracted.suggested_tags.join(", ")}`);

    console.log(`\n✓ JSON OUTPUT (Minified):`);
    console.log(formatEnquiryJson(extracted));

    console.log(`\n✓ JSON OUTPUT (Formatted):`);
    console.log(JSON.stringify(extracted, null, 2));
  }

  console.log("\n" + "=".repeat(80));
  console.log("DEMO COMPLETE");
  console.log("=".repeat(80) + "\n");
  console.log("API Endpoint: POST /api/enquiries/extract");
  console.log("Frontend Page: /enquiry-intake");
  console.log("Documentation: docs/ENQUIRY_INTAKE_SYSTEM.md");
  console.log("\n");
}

runDemo().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exit(1);
});
