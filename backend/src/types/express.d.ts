import type { AgencyAdminRecord } from '../store'
import type { SupabaseAuthUser } from "../middleware/requireSupabaseAuth";

declare global {
  namespace Express {
    // Adds `req.supabaseUser` when using `requireSupabaseAuth`.
    interface Request {
      supabaseUser?: SupabaseAuthUser;
      admin?: AgencyAdminRecord;
      agencyId?: number;
    }
  }
}

export {};

