import { useEffect, useState } from "react";
import { Camera, Loader2, Save, UserRound, MessageSquare, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getStoredClient, saveClientAuth, type ClientUser } from "@/lib/clientAuth";
import { clientFetch, hasActiveClientSession } from "@/lib/supabaseAuth";
import "./ClientTheme.css";

const ClientProfilePage = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientUser | null>(getStoredClient());
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    profileImageUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const isAuthenticated = await hasActiveClientSession();
        if (!isAuthenticated) {
          navigate("/employer-login");
          return;
        }

        const response = await clientFetch("/api/client-auth/me");
        const data = (await response.json().catch(() => ({}))) as {
          client?: ClientUser;
          error?: string;
        };

        if (!response.ok || !data.client) {
          throw new Error(data.error || "Failed to load profile");
        }

        setClient(data.client);
        setForm({
          name: data.client.name || "",
          company: data.client.company || "",
          phone: data.client.phone || "",
          email: data.client.email || "",
          profileImageUrl: data.client.profileImageUrl || "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
        setTimeout(() => setMounted(true), 50);
      }
    };

    void loadProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!(await hasActiveClientSession())) {
      navigate("/employer-login");
      return;
    }

    try {
      setIsSaving(true);
      const response = await clientFetch("/api/client-auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as {
        client?: ClientUser;
        error?: string;
      };

      if (!response.ok || !data.client) {
        throw new Error(data.error || "Failed to update profile");
      }

      saveClientAuth(null, data.client);
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
      <>
        <style>{styles}</style>
        <div className="cp-root">
          <div className="cp-loader">
            <div className="cp-loader-ring" />
            <span>Loading your profile…</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="cp-root">
        {/* Ambient background orbs */}
        <div className="cp-orb cp-orb-1" />
        <div className="cp-orb cp-orb-2" />

        <div className={`cp-shell ${mounted ? "cp-shell--in" : ""}`}>

          {/* ── Header strip ── */}
          <div className="cp-header">
            <div className="cp-eyebrow">Account</div>
            <h1 className="cp-title">Your Profile</h1>
            <p className="cp-subtitle">
              Keep your details current — they appear in requests, chats, and all agency correspondence.
            </p>
          </div>

          {/* ── Avatar card ── */}
          <div className="cp-avatar-card">
            <div className="cp-avatar-wrap">
              <Avatar className="cp-avatar">
                <AvatarImage src={form.profileImageUrl} alt={form.name || "Client"} />
                <AvatarFallback className="cp-avatar-fallback">
                  <UserRound size={28} />
                </AvatarFallback>
              </Avatar>
              <label className="cp-camera-btn" title="Change photo">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleProfilePhoto(e.target.files?.[0])}
                />
              </label>
              <div className="cp-avatar-ring" />
            </div>
            <div className="cp-avatar-meta">
              <p className="cp-avatar-name">{form.name || "Your Name"}</p>
              {form.company && <p className="cp-avatar-company">{form.company}</p>}
              {client && (
                <p className="cp-member-badge">
                  Member since {new Date(client.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* ── Form card ── */}
          <div className="cp-form-card">
            <div className="cp-form-grid">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Jane Doe" },
                { label: "Company", key: "company", type: "text", placeholder: "Optional" },
                { label: "Phone", key: "phone", type: "tel", placeholder: "Optional" },
                { label: "Email", key: "email", type: "email", placeholder: "you@company.com" },
              ].map(({ label, key, type, placeholder }, i) => (
                <div
                  key={key}
                  className="cp-field"
                  style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                >
                  <label className="cp-label">{label}</label>
                  <Input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="cp-input"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="cp-actions">
            <button
              className="cp-btn cp-btn--primary"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={16} className="cp-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSaving ? "Saving…" : "Save Changes"}
            </button>

            <Link to="/client/history" className="cp-btn cp-btn--ghost">
              <Clock size={16} />
              Transaction History
            </Link>

            <Link to="/client/support-chat" className="cp-btn cp-btn--ghost">
              <MessageSquare size={16} />
              Messages
            </Link>
          </div>

        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────
   Scoped styles — no Tailwind conflicts
───────────────────────────────────────────── */
const styles = `
  /* Tokens */
  :root {
    --teal:        #0E4E5E;
    --teal-mid:    #1a6678;
    --teal-light:  #e8f4f7;
    --amber:       #FCD34D;
    --amber-dark:  #e6b800;
    --amber-glow:  rgba(252,211,77,0.22);
    --white:       #ffffff;
    --off:         #f5f9fa;
    --border:      rgba(14,78,94,0.12);
    --text-main:   #0d2f38;
    --text-muted:  #5b7d88;
    --radius-lg:   22px;
    --radius-md:   14px;
  }

  /* Root */
  .cp-root {
    position: relative;
    min-height: 100vh;
    background: linear-gradient(160deg, #e8f4f7 0%, #d0eaf1 50%, #f0f8fb 100%);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 48px 16px 80px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Ambient orbs */
  .cp-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    pointer-events: none;
    animation: cp-drift 12s ease-in-out infinite alternate;
  }
  .cp-orb-1 {
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(14,78,94,0.18), transparent 70%);
    top: -80px; right: -100px;
    animation-delay: 0s;
  }
  .cp-orb-2 {
    width: 340px; height: 340px;
    background: radial-gradient(circle, rgba(252,211,77,0.20), transparent 70%);
    bottom: 60px; left: -80px;
    animation-delay: -5s;
  }
  @keyframes cp-drift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(30px, 20px) scale(1.08); }
  }

  /* Shell */
  .cp-shell {
    position: relative;
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.55s cubic-bezier(.22,1,.36,1), transform 0.55s cubic-bezier(.22,1,.36,1);
  }
  .cp-shell--in {
    opacity: 1;
    transform: translateY(0);
  }

  /* Loader */
  .cp-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    height: 100vh;
    color: var(--teal);
    font-size: 0.95rem;
    font-weight: 500;
  }
  .cp-loader-ring {
    width: 44px; height: 44px;
    border: 3px solid var(--teal-light);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: cp-spin 0.9s linear infinite;
  }

  /* Header */
  .cp-header {
    text-align: center;
    padding: 0 8px 4px;
  }
  .cp-eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--amber-dark);
    background: var(--teal);
    padding: 4px 14px;
    border-radius: 100px;
    margin-bottom: 14px;
  }
  .cp-title {
    font-size: clamp(1.9rem, 5vw, 2.6rem);
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0 0 10px;
  }
  .cp-subtitle {
    font-size: 0.9rem;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0;
    max-width: 380px;
    margin-inline: auto;
  }

  /* Avatar card */
  .cp-avatar-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 2px 20px rgba(14,78,94,0.07);
    transition: box-shadow 0.3s;
  }
  .cp-avatar-card:hover {
    box-shadow: 0 6px 32px rgba(14,78,94,0.12);
  }
  .cp-avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .cp-avatar {
    width: 72px !important;
    height: 72px !important;
    border: 3px solid var(--amber);
    box-shadow: 0 0 0 3px var(--teal);
  }
  .cp-avatar-fallback {
    background: var(--teal-light) !important;
    color: var(--teal) !important;
  }
  .cp-avatar-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px dashed var(--amber);
    opacity: 0.5;
    animation: cp-rotate 18s linear infinite;
  }
  .cp-camera-btn {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 28px; height: 28px;
    background: var(--amber);
    border: 2px solid var(--white);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--teal);
    transition: transform 0.2s, background 0.2s;
    z-index: 2;
  }
  .cp-camera-btn:hover {
    transform: scale(1.12);
    background: var(--amber-dark);
  }
  .cp-avatar-meta {
    min-width: 0;
  }
  .cp-avatar-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 0 0 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cp-avatar-company {
    font-size: 0.85rem;
    color: var(--teal-mid);
    font-weight: 500;
    margin: 0 0 6px;
  }
  .cp-member-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--teal-light);
    padding: 3px 10px;
    border-radius: 100px;
    margin: 0;
  }

  /* Form card */
  .cp-form-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 24px;
    box-shadow: 0 2px 20px rgba(14,78,94,0.07);
  }
  .cp-form-grid {
    display: grid;
    gap: 18px;
  }
  .cp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: cp-rise 0.4s both;
  }
  @keyframes cp-rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cp-label {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .cp-input {
    border-color: var(--border) !important;
    border-radius: var(--radius-md) !important;
    background: var(--off) !important;
    color: var(--text-main) !important;
    font-size: 0.95rem !important;
    height: 46px !important;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
  }
  .cp-input:focus-within,
  .cp-input:focus {
    border-color: var(--teal) !important;
    background: var(--white) !important;
    box-shadow: 0 0 0 3px rgba(14,78,94,0.10) !important;
    outline: none !important;
  }

  /* Actions */
  .cp-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  @media (min-width: 480px) {
    .cp-actions {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
  .cp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 22px;
    height: 46px;
    border-radius: 14px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    border: none;
    transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
    white-space: nowrap;
  }
  .cp-btn:active { transform: scale(0.97); }
  .cp-btn--primary {
    background: var(--teal);
    color: var(--amber);
    box-shadow: 0 4px 16px rgba(14,78,94,0.30);
    flex: 1 0 auto;
  }
  .cp-btn--primary:hover:not(:disabled) {
    background: var(--teal-mid);
    box-shadow: 0 6px 22px rgba(14,78,94,0.38);
    transform: translateY(-1px);
  }
  .cp-btn--primary:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .cp-btn--ghost {
    background: var(--white);
    color: var(--teal);
    border: 1.5px solid var(--border);
    box-shadow: 0 1px 6px rgba(14,78,94,0.06);
  }
  .cp-btn--ghost:hover {
    background: var(--teal-light);
    border-color: var(--teal);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(14,78,94,0.10);
  }

  /* Utility */
  .cp-spin {
    animation: cp-spin 0.8s linear infinite;
  }
  @keyframes cp-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes cp-rotate {
    to { transform: rotate(360deg); }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .cp-orb, .cp-avatar-ring, .cp-spin, .cp-loader-ring { animation: none !important; }
    .cp-shell { transition: none !important; }
    .cp-field { animation: none !important; }
  }
`;

export default ClientProfilePage;