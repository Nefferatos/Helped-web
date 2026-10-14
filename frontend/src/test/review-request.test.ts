import { beforeEach, describe, expect, it } from "vitest";
import { hasSeenReviewRequest, markReviewRequestSeen } from "@/lib/reviewRequest";

describe("review request 'already asked' store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts unseen and remembers once marked", () => {
    expect(hasSeenReviewRequest(1)).toBe(false);
    markReviewRequestSeen(1);
    expect(hasSeenReviewRequest(1)).toBe(true);
  });

  it("scopes the flag per client so one customer never hides it for another", () => {
    markReviewRequestSeen(1);
    expect(hasSeenReviewRequest(1)).toBe(true);
    expect(hasSeenReviewRequest(2)).toBe(false);
  });

  it("keeps a separate flag when nobody is signed in", () => {
    markReviewRequestSeen(null);
    expect(hasSeenReviewRequest(null)).toBe(true);
    expect(hasSeenReviewRequest(1)).toBe(false);
  });
});
