import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { adminPath } from "@/lib/routes";

const navItems = [
  { label: "HOME", path: adminPath("/dashboard") },
  { label: "AGENCY PROFILE", path: adminPath("/agency-profile") },
  { label: "ADD", path: adminPath("/add-maid") },
  { label: "EDIT/DELETE", path: adminPath("/edit-maids") },
  { label: "PASSWORD MANAGEMENT", path: adminPath("/change-password") },
  { label: "INCOMING INQUIRIES", path: adminPath("/enquiry") },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-nav text-nav-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Maid Agency Account Management</h1>
          <button className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity active:scale-[0.97]">
            <span>Log Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <nav className="bg-secondary border-b">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-sm transition-colors active:scale-[0.97] ${
                location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full pt-4">
        <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium">
            Welcome back, <span className="font-semibold">Abel</span>
          </p>
          <span className="text-xs text-black">Dashboard Overview</span>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Copyright STREET PTE LTD. 2026. All Rights Reserved.
      </footer>
    </div>
  );
};

export default AppLayout;
