import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders, getStoredAgencyAdmin } from "@/lib/agencyAdminAuth";
import { ShieldPlus, Users } from "lucide-react";

type Role = "admin" | "staff";

interface CreateAdminResponse {
  error?: string;
  admin?: {
    id: number;
    agencyId: number;
    username: string;
    email?: string;
    role?: Role;
    agencyName: string;
    createdAt: string;
  };
}

const StaffManagement = () => {
  const currentAdmin = getStoredAgencyAdmin();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreateAdminResponse["admin"] | null>(null);

  const suggestedUsername = useMemo(() => {
    const localPart = email.trim().split("@")[0] || "";
    return localPart.replace(/[^a-zA-Z0-9._-]/g, "");
  }, [email]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = (username.trim() || suggestedUsername).toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Email and password are required.");
      return;
    }

    if (!trimmedUsername) {
      toast.error("Username is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/agency/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify({
          email: trimmedEmail,
          username: trimmedUsername,
          password: trimmedPassword,
          role,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as CreateAdminResponse;
      if (!response.ok || !data.admin) {
        throw new Error(data.error || "Failed to create staff account");
      }

      setLastCreated(data.admin);
      setEmail("");
      setUsername("");
      setPassword("");
      setRole("staff");
      toast.success(`${data.admin.role === "admin" ? "Admin" : "Staff"} account created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create staff account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="content-card animate-fade-in-up space-y-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create additional users under the same agency account so your team can log in at the same time.
            </p>
          </div>
          <div className="hidden rounded-xl border bg-muted/30 px-4 py-3 text-right sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Agency</p>
            <p className="text-sm font-semibold text-foreground">{currentAdmin?.agencyName || "Agency"}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form className="space-y-5 rounded-2xl border bg-white p-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <ShieldPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Add Team Member</h2>
                <p className="text-sm text-muted-foreground">Use `staff` for normal access or `admin` for full agency control.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@agency.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-username">Username</Label>
                <Input
                  id="staff-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={suggestedUsername || "staffuser"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-role">Role</Label>
                <select
                  id="staff-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "staff")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staff-password">Temporary Password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
              The new user will automatically inherit the current agency and will see the same shared data after login.
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">How It Works</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Each user gets their own login session and token.</li>
                <li>All users in this agency share the same maids, enquiries, chats, and contracts.</li>
                <li>Existing users stay logged in when a new one signs in.</li>
              </ul>
            </div>

            {lastCreated && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Last Created</p>
                <div className="mt-3 space-y-1 text-sm text-emerald-900">
                  <p><span className="font-semibold">Email:</span> {lastCreated.email || "-"}</p>
                  <p><span className="font-semibold">Username:</span> {lastCreated.username}</p>
                  <p><span className="font-semibold">Role:</span> {lastCreated.role || "admin"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
