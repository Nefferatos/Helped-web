export const readSafeJson = async <T extends { error?: string }>(response: Response): Promise<T> => {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return {} as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const looksLikeHtml =
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.startsWith("<");

    return {
      error: looksLikeHtml
        ? `Server error (${response.status || 503}). Please try again in a moment.`
        : "Server returned an invalid response.",
    } as T;
  }
};
