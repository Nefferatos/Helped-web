import { requireSupabase, supabase } from "@/lib/supabaseClient";
import {
  clearClientAuth,
  getClientAuthHeaders,
  saveClientAuth,
  type ClientUser,
} from "@/lib/clientAuth";

// Social + Phone auth helpers.
// These functions keep your existing app token storage (`client_auth_token`) working by
// reusing the Supabase access token as the Bearer token. The backend accepts it by verifying
// the Supabase JWT.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  window.sessionStorage.clear();
};

const getSupabaseAccessToken = async (fallbackToken?: string) => {
  // Preferred: current Supabase session token (freshest, works after OAuth redirect).
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (token) return token;
    await wait(150);
  }

  // Fallback: caller-provided token (e.g. persisted app token).
  if (fallbackToken?.trim()) return fallbackToken.trim();

  throw new Error("No Supabase session found. Please sign in again.");
};

const getClientMe = async (fallbackAccessToken?: string) => {
  const accessToken = await getSupabaseAccessToken(fallbackAccessToken);
  const meUrl = new URL("/api/client-auth/me", window.location.origin).toString();

  const response = await fetch(meUrl, {
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

export const finalizeClientLoginFromSupabase = async (accessToken?: string) => {
  // Fetch the app-facing client record (creates one on first login).
  const token = await getSupabaseAccessToken(accessToken);
  const client = await getClientMe(token);
  clearClientLogoutMarker();
  saveClientAuth(token, client);
  return client;
};

export const logoutClientPortal = async (redirectTo = "/") => {
  setClientLogoutMarker();

  try {
    await fetch("/api/client-auth/logout", {
      method: "POST",
      headers: { ...getClientAuthHeaders() },
    });
  } catch {
    // Ignore API logout errors; local sign-out still needs to finish.
  }

  try {
    if (supabase) {
      await supabase.auth.signOut({ scope: "global" });
    }
  } catch {
    // Continue clearing local state even if Supabase sign-out fails.
  }

  clearSupabaseSessionStorage();
  clearClientAuth();

  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
};

export const signInWithGoogle = async () => {
  // OAuth redirect flow. Supabase will store the session in localStorage.
  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
};

export const signInWithFacebook = async () => {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
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
  return data.session.access_token;
};

export const bootstrapClientAuthFromSupabase = async () => {
  // Persist login across refresh: if Supabase has a session, mirror it into existing local storage.
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return null;

  // Save a full client record if possible.
  try {
    return await finalizeClientLoginFromSupabase(accessToken);
  } catch {
    // Worst case: keep token only; app can recover when `/api/client-auth/me` succeeds.
    const fallback: ClientUser = {
      id: 0,
      name: "",
      email: data.session?.user?.email || "",
      createdAt: new Date().toISOString(),
    };
    saveClientAuth(accessToken, fallback);
    return fallback;
  }
};
