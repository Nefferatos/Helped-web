import { requireSupabase, supabase } from "@/lib/supabaseClient";
import {
  clearClientAuth,
  getStoredClient,
  refreshClientToken,
  saveClientAuth,
  type ClientUser,
} from "@/lib/clientAuth";

const LEGACY_SUPABASE_TOKEN_KEY = "supabase.auth.token";
const CLIENT_LOGOUT_MARKER_KEY = "client_portal_logout_pending";

const setClientLogoutMarker = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_LOGOUT_MARKER_KEY, "true");
};

const clearClientLogoutMarker = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLIENT_LOGOUT_MARKER_KEY);
};

export const isClientLogoutPending = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_LOGOUT_MARKER_KEY) === "true";
};

export const clearSupabaseSessionStorage = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LEGACY_SUPABASE_TOKEN_KEY);

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (
      key === CLIENT_LOGOUT_MARKER_KEY ||
      key?.startsWith("sb-") ||
      key?.startsWith("supabase.auth.")
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  window.sessionStorage.clear();
};

const getClientMe = async (accessToken: string) => {
  const response = await fetch("/api/client-auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = (await response.json().catch(() => ({}))) as {
    client?: ClientUser;
    error?: string;
  };

  if (!response.ok || !data.client) {
    throw new Error(data.error || "Failed to load client profile");
  }

  return data.client;
};

// ── Profile cache ────────────────────────────────────────────────────────────
// Avoids a /api/client-auth/me round-trip on every route change.
// TTL is 30 s — short enough to reflect profile updates promptly,
// long enough to cover rapid navigation.
let profileCache: { user: ClientUser; expiresAt: number } | null = null;

const clearProfileCache = () => {
  profileCache = null;
};

// ── Inflight deduplication ───────────────────────────────────────────────────
// Prevents parallel /me requests when multiple components call
// syncClientProfileFromSession at the same time (e.g. navbar + App.tsx).
let inflightSync: Promise<ClientUser | null> | null = null;

// ── Public helpers ───────────────────────────────────────────────────────────

export const primeClientAuth = async () => {
  const token = await refreshClientToken();
  if (!token) {
    saveClientAuth(null, null);
    return null;
  }

  return token;
};

export const getCurrentClientSession = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
};

export const hasActiveClientSession = async () => {
  const session = await getCurrentClientSession();
  return Boolean(session?.access_token) && !isClientLogoutPending();
};

export const finalizeClientLoginFromSupabase = async () => {
  const token = await primeClientAuth();
  if (!token) {
    throw new Error("No Supabase session found. Please sign in again.");
  }

  const client = await getClientMe(token);
  clearClientLogoutMarker();
  profileCache = { user: client, expiresAt: Date.now() + 30_000 };
  saveClientAuth(token, client);
  return client;
};

export const syncClientProfileFromSession = async (): Promise<ClientUser | null> => {
  // Deduplicate: if a sync is already in flight, wait for it instead of
  // firing a second parallel request.
  if (inflightSync) return inflightSync;

  inflightSync = _doSync().finally(() => {
    inflightSync = null;
  });

  return inflightSync;
};

const _doSync = async (): Promise<ClientUser | null> => {
  const token = await primeClientAuth();
  if (!token) {
    saveClientAuth(null, null);
    return null;
  }

  // Return cached profile if still fresh.
  if (profileCache && Date.now() < profileCache.expiresAt) {
    saveClientAuth(token, profileCache.user);
    return profileCache.user;
  }

  try {
    const client = await getClientMe(token);
    profileCache = { user: client, expiresAt: Date.now() + 30_000 };
    saveClientAuth(token, client);
    return client;
  } catch {
    // Network hiccup — return stored profile rather than logging the user out.
    const fallback = getStoredClient();
    saveClientAuth(token, fallback);
    return fallback;
  }
};

export const handleInvalidClientSession = async (redirectTo = "/employer-login") => {
  setClientLogoutMarker();
  clearProfileCache();

  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Keep clearing local state even when Supabase rejects the sign-out.
  }

  clearSupabaseSessionStorage();
  clearClientAuth();

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
};

export const clientFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = await primeClientAuth();
  if (!token || isClientLogoutPending()) {
    await handleInvalidClientSession();
    throw new Error("No active Supabase session");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // FIX: Only log out on explicit session errors, not every 401.
  // A transient 401 (clock skew, non-auth endpoint) should not nuke the session.
  if (response.status === 401) {
    const cloned = response.clone();
    const payload = (await cloned.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const errorText = String(payload.error || payload.message || "").toLowerCase();

    if (
      errorText.includes("session_not_found") ||
      errorText.includes("invalid_token") ||
      errorText.includes("jwt expired")
    ) {
      await handleInvalidClientSession();
    }
    // For all other 401s, let the caller decide what to do.
    return response;
  }

  if (response.status === 403) {
    const cloned = response.clone();
    const payload = (await cloned.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const errorText = String(payload.error || payload.message || "").toLowerCase();

    if (errorText.includes("session_not_found") || errorText.includes("forbidden")) {
      await handleInvalidClientSession();
    }
  }

  return response;
};

export const logoutClientPortal = async (redirectTo = "/") => {
  // FIX: Clear local state synchronously first, then fire network cleanup
  // in the background. This ensures the redirect is instant and localStorage
  // is cleared before navigation (window.location.replace fires immediately
  // after, so anything after it may never run).
  setClientLogoutMarker();
  clearProfileCache();
  clearClientAuth();
  clearSupabaseSessionStorage();

  // Get the token before we wipe everything — needed for the API call.
  // primeClientAuth reads from the Supabase session which we haven't cleared yet.
  const token = await primeClientAuth().catch(() => null);

  // Fire network cleanup in the background — do NOT await.
  // If either call fails the logout marker + cleared storage still protects us.
  void Promise.allSettled([
    token
      ? fetch("/api/client-auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })
      : Promise.resolve(),
    supabase ? supabase.auth.signOut() : Promise.resolve(),
  ]);

  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.replace(redirectTo);
  }
};

export const signInWithGoogle = async (redirectPath?: string) => {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  if (redirectPath?.trim()) {
    callbackUrl.searchParams.set("redirectTo", redirectPath.trim());
  }

  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });
  if (error) throw error;
};

export const signInWithFacebook = async (redirectPath?: string) => {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  if (redirectPath?.trim()) {
    callbackUrl.searchParams.set("redirectTo", redirectPath.trim());
  }

  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: callbackUrl.toString() },
  });
  if (error) throw error;
};

export const sendPhoneOtp = async (phone: string) => {
  const { error } = await requireSupabase().auth.signInWithOtp({ phone });
  if (error) throw error;
};

export const verifyPhoneOtp = async (phone: string, code: string) => {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    phone,
    token: code,
    type: "sms",
  });
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("No session returned from Supabase");
  }
  await finalizeClientLoginFromSupabase();
  return data.session.access_token;
};