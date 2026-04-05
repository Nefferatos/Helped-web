import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase client (frontend).
// Uses env vars injected at build time.
// IMPORTANT: Uses ONLY these two keys (no hardcoded/fallback values).
const supabaseUrl = import.meta.env.SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY and rebuild.",
    );
  }
  return supabase;
};
