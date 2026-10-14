/**
 * Remembers that a client has already been shown the Google review request, so
 * the portal asks once per client instead of on every visit.
 *
 * Mirrors the "guide already seen" pattern used by ClientSupportChat: a plain
 * localStorage flag, scoped per client so a second client on the same browser
 * still gets asked. Storage failures fail open (the request just shows again)
 * rather than silently suppressing it forever.
 */

const STORAGE_KEY_PREFIX = "helped:google-review-request-seen:v1";

const storageKey = (clientId?: number | null) =>
  clientId ? `${STORAGE_KEY_PREFIX}:${clientId}` : STORAGE_KEY_PREFIX;

const readStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const hasSeenReviewRequest = (clientId?: number | null) => {
  const storage = readStorage();
  if (!storage) return false;
  try {
    return storage.getItem(storageKey(clientId)) === "1";
  } catch {
    return false;
  }
};

export const markReviewRequestSeen = (clientId?: number | null) => {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(clientId), "1");
  } catch {
    // Storage unavailable (private mode / quota) — the request simply shows again.
  }
};
