import { requireSupabase, supabase } from "@/lib/supabaseClient";
import { saveClientAuth, type ClientUser } from "@/lib/clientAuth";

// Social + Phone auth helpers.
// These functions keep your existing app token storage (`client_auth_token`) working by
// reusing the Supabase access token as the Bearer token. The backend accepts it by verifying
// the Supabase JWT.

const getClientMe = async (accessToken: string) => {
  const response = await fetch("/api/client-auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
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

export const finalizeClientLoginFromSupabase = async (accessToken: string) => {
  // Fetch the app-facing client record (creates one on first login).
  const client = await getClientMe(accessToken);
  saveClientAuth(accessToken, client);
  return client;
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
  const { error } = await requireSupabase().auth.signInWithOAuth({
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
