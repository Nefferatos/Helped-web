import { describe, expect, it } from "vitest";
import { shouldShowGlobalAiCommandCenter } from "../App";

describe("shouldShowGlobalAiCommandCenter", () => {
  it("hides the AI command on the agency message page", () => {
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/chat-support")).toBe(false);
  });

  it("shows the AI command only on the agency dashboard", () => {
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/dashboard")).toBe(true);
    expect(shouldShowGlobalAiCommandCenter("/agencyadmin/ai-agents")).toBe(false);
  });
});
