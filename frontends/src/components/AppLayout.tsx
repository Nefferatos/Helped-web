import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "HOME", path: "/" },
  { label: "AGENCY PROFILE", path: "/agency-profile" },
  { label: "ADD MAIDS", path: "/add-maid" },
  { label: "EDIT/DELETE MAIDS", path: "/edit-maids" },
  { label: "CHANGE PASSWORD", path: "/change-password" },
  { label: "ENQUIRY", path: "/enquiry" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="bg-nav text-nav-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Maid Agency Account Management</h1>
          <button className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity active:scale-[0.97]">
            <span>Log Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-secondary border-b">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap gap-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-sm transition-colors active:scale-[0.97] ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Welcome bar */}
      <div className="max-w-5xl mx-auto px-4 w-full">
        <p className="text-accent font-semibold text-sm pt-4">Welcome! abel</p>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © Copyright STREET PTE LTD. 2005-2026. All Rights Reserved.
      </footer>
    </div>
  );
};

export default AppLayout;
