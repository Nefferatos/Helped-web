const DRAFT_KEY = "helped:shared-broadcast-draft:v1";

export function saveSharedBroadcastDraft(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ message: trimmed, savedAt: new Date().toISOString() }));
  } catch {
    // Local draft sharing is optional; the campaign itself remains unaffected.
  }
}

export function readSharedBroadcastDraft(): string {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as { message?: unknown } | null;
    return typeof value?.message === "string" ? value.message : "";
  } catch {
    return "";
  }
}
