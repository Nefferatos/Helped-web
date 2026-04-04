import { Router } from "express";
import { requireSupabaseAuth } from "../middleware/requireSupabaseAuth";

const router = Router();

// Example protected route.
// Client must send `Authorization: Bearer <supabase_access_token>`.
router.get("/dashboard", requireSupabaseAuth, (req, res) => {
  res.status(200).json({
    message: "Welcome to the dashboard",
    user: req.supabaseUser,
  });
});

export default router;

