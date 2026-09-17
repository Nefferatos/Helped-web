import { describe, expect, it } from "vitest";
import { shouldShowGlobalAiCommandCenter } from "../App";

describe("shouldShowGlobalAiCommandCenter", () => {
  it("hides the AI command on the agency message page", () => {
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/chat-support")).toBe(false);
  });

  it("keeps the AI command on other dashboard pages", () => {
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/dashboard")).toBe(true);
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/ai-agents")).toBe(false);
  });
});
