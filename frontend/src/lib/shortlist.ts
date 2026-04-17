const SHORTLIST_STORAGE_KEY = "clientShortlistRefs";
const SHORTLIST_UPDATED_EVENT = "client-shortlist-updated";

const normalizeShortlistRefs = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

export const getSavedShortlistRefs = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    return normalizeShortlistRefs(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
};

export const saveShortlistRefs = (refs: string[]): string[] => {
  const normalized = normalizeShortlistRefs(refs);
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent<string[]>(SHORTLIST_UPDATED_EVENT, { detail: normalized }));
  } catch {
    // ignore
  }
  return normalized;
};

export const toggleShortlistRef = (ref: string): string[] => {
  const normalizedRef = String(ref || "").trim();
  if (!normalizedRef) return getSavedShortlistRefs();
  const current = getSavedShortlistRefs();
  const next = current.includes(normalizedRef)
    ? current.filter((item) => item !== normalizedRef)
    : [...current, normalizedRef];
  return saveShortlistRefs(next);
};

export const subscribeToShortlistRefs = (listener: (refs: string[]) => void): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SHORTLIST_STORAGE_KEY) return;
    listener(getSavedShortlistRefs());
  };

  const handleShortlistUpdated = (event: Event) => {
    const detail = (event as CustomEvent<string[]>).detail;
    listener(normalizeShortlistRefs(detail));
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SHORTLIST_UPDATED_EVENT, handleShortlistUpdated);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SHORTLIST_UPDATED_EVENT, handleShortlistUpdated);
  };
};
