import { Link } from "react-router-dom";
import { UserCircle, UserPlus, Users, KeyRound, FileText } from "lucide-react";

const menuItems = [
  { icon: UserCircle, label: "Agency Profile", desc: "View and edit your agency details", path: "/agency-profile" },
  { icon: UserPlus, label: "Add Maids", desc: "Register new maid profiles", path: "/add-maid" },
  { icon: Users, label: "Edit/Delete Maids", desc: "Manage existing maid records", path: "/edit-maids" },
  { icon: KeyRound, label: "Change Password", desc: "Update your account password", path: "/change-password" },
  { icon: FileText, label: "Employment Contracts & Forms", desc: "Access employment documents", path: "/employment-contracts" },
];

const HomePage = () => {
  return (
    <div className="page-container">
      <div className="content-card space-y-6" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="text-accent font-bold">86</span> maids in public, and{" "}
              <span className="text-destructive font-bold">10181</span> maids hidden.
            </p>
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
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
