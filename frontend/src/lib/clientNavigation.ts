export const DEFAULT_CLIENT_POST_LOGIN_PATH = "/client/maids/search";

export const buildEmployerLoginPath = (redirectTo?: string) => {
  const target = redirectTo?.trim();
  if (!target) return "/employer-login";

  const params = new URLSearchParams();
  params.set("redirectTo", target);
  return `/employer-login?${params.toString()}`;
};

export const getClientPostLoginPath = (redirectTo?: string | null) => {
  const target = redirectTo?.trim();
  if (!target) return DEFAULT_CLIENT_POST_LOGIN_PATH;

  if (!target.startsWith("/")) return DEFAULT_CLIENT_POST_LOGIN_PATH;
  if (target.startsWith("//")) return DEFAULT_CLIENT_POST_LOGIN_PATH;

  return target;
};

// OAuth providers (Supabase) reject overly long redirect URLs, and our search
// destinations carry a large `filters` query string. Rather than smuggling the
// destination through the provider redirect, stash it locally before starting
// OAuth and read it back on the callback page.
const POST_LOGIN_REDIRECT_KEY = "clientPostLoginRedirect";

export const stashPostLoginRedirect = (redirectTo?: string | null) => {
  if (typeof window === "undefined") return;
  const target = getClientPostLoginPath(redirectTo);
  try {
    if (target === DEFAULT_CLIENT_POST_LOGIN_PATH) {
      window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    } else {
      window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, target);
    }
  } catch {
    // Ignore storage failures (private mode, etc.) — we fall back to the default path.
  }
};

export const consumePostLoginRedirect = (fallback?: string | null) => {
  if (typeof window === "undefined") return getClientPostLoginPath(fallback);
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch {
    // Ignore storage failures — fall back to the query-param value.
  }
  return getClientPostLoginPath(stored ?? fallback);
};
