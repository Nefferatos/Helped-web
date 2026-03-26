import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCircle, UserPlus, Users, KeyRound, FileText, Bell, MessageCircle } from "lucide-react";
import { adminPath } from "@/lib/routes";
import { toast } from "@/components/ui/sonner";

interface DashboardSummary {
  publicMaids: number;
  hiddenMaids: number;
  totalMaids: number;
  maidsWithPhotos: number;
  enquiries: number;
  requests: number;
  pendingRequests: number;
  unreadAgencyChats: number;
  momPersonnel: number;
  testimonials: number;
  galleryImages: number;
}

const menuItems = [
  { icon: UserCircle, label: "Agency Profile", desc: "View and edit your agency details", path: adminPath("/agency-profile") },
  { icon: UserPlus, label: "Add Maids", desc: "Register new maid profiles", path: adminPath("/add-maid") },
  { icon: Users, label: "Edit/Delete Maids", desc: "Manage existing maid records", path: adminPath("/edit-maids") },
  { icon: Bell, label: "Maid Requests", desc: "View client maid requests and notifications", path: adminPath("/requests") },
  { icon: MessageCircle, label: "Chat Support", desc: "Reply to client chat messages", path: adminPath("/chat-support") },
  { icon: KeyRound, label: "Change Password", desc: "Update your account password", path: adminPath("/change-password") },
  { icon: FileText, label: "Employment Contracts & Forms", desc: "Access employment documents", path: adminPath("/employment-contracts") },
];

const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/company/summary");
        const data = (await response.json().catch(() => ({}))) as Partial<DashboardSummary> & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load dashboard summary");
        }
        setSummary({
          publicMaids: data.publicMaids ?? 0,
          hiddenMaids: data.hiddenMaids ?? 0,
          totalMaids: data.totalMaids ?? 0,
          maidsWithPhotos: data.maidsWithPhotos ?? 0,
          enquiries: data.enquiries ?? 0,
          requests: data.requests ?? 0,
          pendingRequests: data.pendingRequests ?? 0,
          unreadAgencyChats: data.unreadAgencyChats ?? 0,
          momPersonnel: data.momPersonnel ?? 0,
          testimonials: data.testimonials ?? 0,
          galleryImages: data.galleryImages ?? 0,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard summary");
      }
    };

    void loadSummary();
  }, []);

  return (
<div className="container mx-auto py-10 px-4 lg:px-8 max-w-4xl space-y-8">
      <div className="content-card space-y-6" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-black font-semibold">
              <span className="text-accent font-bold">{summary?.publicMaids ?? "..."}</span> maids in public, and{" "}
              <span className="text-destructive font-bold">{summary?.hiddenMaids ?? "..."}</span> maids hidden.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Maids</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.totalMaids ?? "..."}</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">With Photos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.maidsWithPhotos ?? "..."}</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Enquiries</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.enquiries ?? "..."}</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Testimonials</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.testimonials ?? "..."}</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Requests</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.pendingRequests ?? "..."}</p>
          </div>
          <div className="rounded-lg border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unread Chats</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary?.unreadAgencyChats ?? "..."}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {menuItems.map((item, i) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/30 hover:bg-secondary/50 transition-all group active:scale-[0.98]"
              style={{ animation: "fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.07}s`, opacity: 0 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{item.label}</p>
                <p className="text-sm text-muted-black">
                  {item.label === "Agency Profile" && summary
                    ? `${summary.momPersonnel} MOM personnel, ${summary.galleryImages} gallery images`
                    : item.label === "Edit/Delete Maids" && summary
                    ? `${summary.publicMaids} public, ${summary.hiddenMaids} hidden`
                    : item.label === "Maid Requests" && summary
                    ? `${summary.pendingRequests} pending, ${summary.requests} total requests`
                    : item.label === "Chat Support" && summary
                    ? `${summary.unreadAgencyChats} unread chat messages`
                    : item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
