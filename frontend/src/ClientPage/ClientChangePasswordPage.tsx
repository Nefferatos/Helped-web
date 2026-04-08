import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSupabase } from "@/lib/supabaseClient";
import "./ClientTheme.css";

const ClientChangePasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      const sb = requireSupabase();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="client-page-theme min-h-[calc(100dvh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
        <div className="rounded-[28px] border bg-card p-6 shadow-sm sm:p-7">
          <h1 className="font-display text-2xl font-bold text-foreground">Change Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your client portal password.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full rounded-2xl" disabled={isSaving} size="lg">
              {isSaving ? "Saving..." : "Update Password"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ClientChangePasswordPage;

