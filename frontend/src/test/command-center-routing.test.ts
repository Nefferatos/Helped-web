import { describe, expect, it } from "vitest";
import { requiresMakeCommandCenterAgent } from "../../../functions/api/services/ai/commandCenterRouting";

describe("requiresMakeCommandCenterAgent", () => {
  it("routes WhatsApp broadcast requests through Make", () => {
    expect(requiresMakeCommandCenterAgent("can you broadcast using whatsapp?")).toBe(true);
    expect(requiresMakeCommandCenterAgent("Please send a WhatsApp broadcast")).toBe(true);
  });

  it("keeps how-to questions on the conversational path", () => {
    expect(requiresMakeCommandCenterAgent("How do I broadcast using WhatsApp?")).toBe(false);
    expect(requiresMakeCommandCenterAgent("What can you do?")).toBe(false);
  });
});
