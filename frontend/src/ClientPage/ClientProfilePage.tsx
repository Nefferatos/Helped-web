import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Loader2, Save, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { clearClientAuth, getClientAuthHeaders, getClientToken, getStoredClient, saveClientAuth, type ClientUser } from "@/lib/clientAuth";
import "./ClientTheme.css";

const ClientProfilePage = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientUser | null>(getStoredClient());
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    profileImageUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      navigate("/employer-login");
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/client-auth/me", {
          headers: { ...getClientAuthHeaders() },
        });
        const data = (await response.json().catch(() => ({}))) as {
          client?: ClientUser;
          error?: string;
        };

        if (response.status === 401) {
          clearClientAuth();
          navigate("/employer-login");
          return;
        }

        if (!response.ok || !data.client) {
          throw new Error(data.error || "Failed to load profile");
        }

        setClient(data.client);
        setForm({
          name: data.client.name || "",
          company: data.client.company || "",
          email: data.client.email || "",
          profileImageUrl: data.client.profileImageUrl || "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [navigate]);

  const handleSave = async () => {
    const token = getClientToken();
    if (!token) {
      navigate("/employer-login");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/client-auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getClientAuthHeaders(),
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as {
        client?: ClientUser;
        error?: string;
      };

      if (!response.ok || !data.client) {
        throw new Error(data.error || "Failed to update profile");
      }

      saveClientAuth(token, data.client);
      setClient(data.client);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        profileImageUrl: String(reader.result || ""),
      }));
    };
    reader.onerror = () => toast.error("Failed to read image");
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen">
        <div className="container py-16 text-center text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="client-page-theme min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Link to="/client/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="rounded-[28px] border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={form.profileImageUrl} alt={form.name || "Client"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <UserRound className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm">
                  <Camera className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])} />
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Profile</p>
                <h1 className="font-display text-3xl font-bold text-foreground">Client account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Keep your client details up to date for requests, chats, and agency follow-up.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Company</label>
                <Input value={form.company} onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))} placeholder="Optional" />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void handleSave()} disabled={isSaving} className="w-full rounded-2xl sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
              <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto">
                <Link to="/client/history">View Transaction History</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-2xl sm:w-auto">
                <Link to="/client/support-chat">Open Messages</Link>
              </Button>
            </div>

            {client ? (
              <div className="mt-6 rounded-[22px] bg-muted/45 p-4 text-sm text-muted-foreground">
                Member since {new Date(client.createdAt).toLocaleDateString()}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientProfilePage;
