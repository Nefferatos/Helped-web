import type { NextFunction, Request, Response } from "express";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
};

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
};

// Express middleware: verifies a Supabase access token (JWT) by calling Supabase Auth.
// This avoids implementing JWKS signature verification and works reliably for OAuth + phone OTP.
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

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseServiceRoleKey,
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        // ignore
      }
      console.error("Supabase auth verify failed:", {
        status: response.status,
        supabaseUrl,
        tokenLength: token.length,
        details: details.slice(0, 300),
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = (await response.json()) as SupabaseAuthUser;
    (req as Request & { supabaseUser?: SupabaseAuthUser }).supabaseUser = user;
    next();
  } catch (error) {
    console.error("Supabase auth verify failed:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
