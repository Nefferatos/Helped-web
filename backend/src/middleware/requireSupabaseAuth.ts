import type { NextFunction, Request, Response } from "express";
import { verifySupabaseToken, type SupabaseAuthUser } from "../lib/supabaseAuthVerify";

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
};

// Express middleware: verifies a Supabase access token (JWT) by calling Supabase Auth.
// This avoids implementing JWKS signature verification and works reliably for OAuth + phone OTP.
//
// NOTE: This adds ~50–150 ms to every authenticated request and counts against
// Supabase's Auth API rate limits. If that becomes a bottleneck, consider
// caching valid tokens for ~30 s (keyed by token hash) or switching to local
// JWKS verification for non-revocation-sensitive endpoints.
export const requireSupabaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = getBearerToken(req);
  if (!token) {
    console.warn("Auth: missing Authorization Bearer token");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await verifySupabaseToken(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as Request & { supabaseUser?: SupabaseAuthUser }).supabaseUser = user;
    next();
  } catch (error) {
    console.error("Supabase auth verify failed:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
