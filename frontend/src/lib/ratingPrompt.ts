/**
 * Remembers that a signed-in client has already been shown the rating popup, so
 * the portal asks once per client instead of on every visit.
 *
 * Mirrors the "review request already seen" pattern in reviewRequest.ts: a plain
 * localStorage flag scoped per client, failing open (the popup simply shows
 * again) when storage is unavailable.
 */

const STORAGE_KEY_PREFIX = "helped:rating-popup-seen:v1";

const storageKey = (clientId?: number | null) =>
  clientId ? `${STORAGE_KEY_PREFIX}:${clientId}` : STORAGE_KEY_PREFIX;

const readStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const hasSeenRatingPrompt = (clientId?: number | null) => {
  const storage = readStorage();
  if (!storage) return false;
  try {
    return storage.getItem(storageKey(clientId)) === "1";
  } catch {
    return false;
  }
};

export const markRatingPromptSeen = (clientId?: number | null) => {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(clientId), "1");
  } catch {
    // Storage unavailable (private mode / quota) — the popup simply shows again.
  }
};
