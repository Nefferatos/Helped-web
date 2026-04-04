import type { SupabaseAuthUser } from "../middleware/requireSupabaseAuth";

declare global {
  namespace Express {
    // Adds `req.supabaseUser` when using `requireSupabaseAuth`.
    interface Request {
      supabaseUser?: SupabaseAuthUser;
    }
  }
}

export {};

