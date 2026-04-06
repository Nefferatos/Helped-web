import type { SupabaseClient } from "@supabase/supabase-js";

type SessionFromUrlResult = {
  data: { session: unknown | null };
  error: unknown | null;
  urlHadAuthParams: boolean;
};

// Supabase JS v2 no longer exposes `auth.getSessionFromUrl()` publicly in all builds.
// This helper implements the same behavior using supported APIs:
// - `?code=...` (PKCE): `exchangeCodeForSession(code)`
// - `#access_token=...&refresh_token=...` (implicit): `setSession(...)`
export const getSessionFromUrlCompat = async (
  sb: SupabaseClient,
): Promise<SessionFromUrlResult> => {
  let urlHadAuthParams = false;

  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      urlHadAuthParams = true;
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      return { data: { session: data?.session ?? null }, error, urlHadAuthParams };
    }
  } catch (error) {
    return { data: { session: null }, error, urlHadAuthParams };
  }

  try {
    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    if (!hash) {
      return { data: { session: null }, error: null, urlHadAuthParams };
    }

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token") || "";
    const refreshToken = hashParams.get("refresh_token") || "";
    if (accessToken || refreshToken) {
      urlHadAuthParams = true;
    }

    if (!accessToken || !refreshToken) {
      return { data: { session: null }, error: null, urlHadAuthParams };
    }

    const { data, error } = await sb.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return { data: { session: data?.session ?? null }, error, urlHadAuthParams };
  } catch (error) {
    return { data: { session: null }, error, urlHadAuthParams };
  }
};

