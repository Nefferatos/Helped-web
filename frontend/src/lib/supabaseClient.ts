import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase client (frontend).
// Cloudflare Workers uses SUPABASE_*
// Vite frontend expects VITE_*
// This fallback ensures both environments work
const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL)?.trim();
// IMPORTANT: use the anon key (public). Do NOT use the service_role key in the frontend.
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)?.trim();

// Safe debug logs (do NOT log actual values)
console.log("Supabase URL loaded:", !!supabaseUrl);
console.log("Supabase Key loaded:", !!supabaseAnonKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const requireSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }
  if (!supabase) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY and rebuild.");
  }
  return supabase;
};
