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
  saveClientAuth(token, client);
  return client;
};

export const syncClientProfileFromSession = async () => {
  const token = await primeClientAuth();
  if (!token) {
    saveClientAuth(null, null);
    return null;
  }

  try {
    const client = await getClientMe(token);
    saveClientAuth(token, client);
    return client;
  } catch {
    const fallback = getStoredClient();
    saveClientAuth(token, fallback);
    return fallback;
  }
};

export const handleInvalidClientSession = async (redirectTo = "/employer-login") => {
  setClientLogoutMarker();

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

  if (response.status === 401 || response.status === 403) {
    const cloned = response.clone();
    const payload = (await cloned.json().catch(() => ({}))) as { error?: string; message?: string };
    const errorText = String(payload.error || payload.message || "").toLowerCase();

    if (errorText.includes("session_not_found") || response.status === 403 || response.status === 401) {
      await handleInvalidClientSession();
    }
  }

  return response;
};

export const logoutClientPortal = async (redirectTo = "/") => {
  setClientLogoutMarker();

  try {
    const token = await primeClientAuth();
    if (token) {
      await fetch("/api/client-auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    }
  } catch {
    // API logout is best effort.
  }

  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Continue with local cleanup.
  }

  clearSupabaseSessionStorage();
  clearClientAuth();

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
