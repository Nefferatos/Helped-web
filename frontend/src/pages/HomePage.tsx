import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

/* ─── 3-D SVG icon components ──────────────────────────────────────────── */

const IconAgencyProfile = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="ag1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <filter id="agsh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1d4ed8" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Building body */}
    <rect x="8" y="18" width="34" height="30" rx="3" fill="url(#ag1)" filter="url(#agsh)" />
    {/* Roof / top face */}
    <polygon points="5,18 25,8 50,18 25,20" fill="url(#ag2)" />
    {/* Right side face */}
    <polygon points="42,18 50,18 50,48 42,48" fill="#1e40af" opacity="0.6" />
    {/* Windows */}
    <rect x="14" y="24" width="6" height="6" rx="1" fill="#bfdbfe" opacity="0.9" />
    <rect x="24" y="24" width="6" height="6" rx="1" fill="#bfdbfe" opacity="0.9" />
    <rect x="14" y="34" width="6" height="6" rx="1" fill="#bfdbfe" opacity="0.9" />
    <rect x="24" y="34" width="6" height="6" rx="1" fill="#bfdbfe" opacity="0.9" />
    {/* Door */}
    <rect x="20" y="40" width="9" height="8" rx="1.5" fill="#93c5fd" />
    {/* Shine */}
    <rect x="9" y="19" width="15" height="4" rx="1" fill="white" opacity="0.15" />
  </svg>
);

const IconAddMaid = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="am1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="am2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      <filter id="amsh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#065f46" floodOpacity="0.45" />
      </filter>
    </defs>
    {/* Card body */}
    <rect x="6" y="12" width="38" height="32" rx="5" fill="url(#am1)" filter="url(#amsh)" />
    {/* Card side */}
    <rect x="44" y="15" width="6" height="26" rx="2" fill="#047857" />
    {/* User silhouette */}
    <circle cx="25" cy="24" r="6" fill="#d1fae5" opacity="0.9" />
    <ellipse cx="25" cy="37" rx="9" ry="5" fill="#d1fae5" opacity="0.9" />
    {/* Plus badge */}
    <circle cx="40" cy="16" r="9" fill="#f0fdf4" />
    <rect x="36" y="15" width="8" height="2.5" rx="1.2" fill="#059669" />
    <rect x="38.75" y="12.75" width="2.5" height="8" rx="1.2" fill="#059669" />
    {/* Shine */}
    <rect x="7" y="13" width="20" height="4" rx="2" fill="white" opacity="0.18" />
  </svg>
);

const IconEditMaid = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="em1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <filter id="emsh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#9a3412" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* People stack */}
    <circle cx="18" cy="22" r="7" fill="url(#em1)" filter="url(#emsh)" />
    <ellipse cx="18" cy="36" rx="11" ry="6" fill="url(#em1)" filter="url(#emsh)" />
    <circle cx="32" cy="20" r="6" fill="#fed7aa" opacity="0.85" />
    <ellipse cx="32" cy="33" rx="9" ry="5" fill="#fed7aa" opacity="0.85" />
    {/* Pencil */}
    <g transform="rotate(-35 40 14)" filter="url(#emsh)">
      <rect x="35" y="8" width="7" height="18" rx="2" fill="#fbbf24" />
      <polygon points="35,26 42,26 38.5,32" fill="#f59e0b" />
      <rect x="35" y="8" width="7" height="4" rx="2" fill="#d1d5db" />
    </g>
    {/* Shine */}
    <ellipse cx="16" cy="18" rx="3" ry="2" fill="white" opacity="0.3" />
  </svg>
);

const IconChangePassword = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="cp1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="cp2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="cpsh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4c1d95" floodOpacity="0.45" />
      </filter>
    </defs>
    {/* Lock body */}
    <rect x="10" y="26" width="32" height="22" rx="5" fill="url(#cp1)" filter="url(#cpsh)" />
    {/* Lock right side */}
    <rect x="42" y="30" width="5" height="15" rx="2" fill="#5b21b6" />
    {/* Shackle */}
    <path d="M18 26 V18 a10 10 0 0 1 20 0 V26" stroke="url(#cp2)" strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* Keyhole */}
    <circle cx="26" cy="36" r="4" fill="#ede9fe" />
    <rect x="24.5" y="38" width="3" height="5" rx="1.5" fill="#ede9fe" />
    {/* Shine */}
    <rect x="11" y="27" width="18" height="4" rx="2" fill="white" opacity="0.2" />
  </svg>
);

const IconContracts = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="ct1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>
      <filter id="ctsh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#831843" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Paper stack shadow */}
    <rect x="14" y="12" width="30" height="36" rx="4" fill="#fda4af" opacity="0.5" transform="translate(4,4)" />
    {/* Paper body */}
    <rect x="10" y="8" width="30" height="36" rx="4" fill="url(#ct1)" filter="url(#ctsh)" />
    {/* Right edge */}
    <rect x="40" y="12" width="5" height="28" rx="2" fill="#9d174d" />
    {/* Lines */}
    <rect x="15" y="18" width="18" height="2.5" rx="1.2" fill="white" opacity="0.8" />
    <rect x="15" y="24" width="22" height="2.5" rx="1.2" fill="white" opacity="0.8" />
    <rect x="15" y="30" width="16" height="2.5" rx="1.2" fill="white" opacity="0.8" />
    <rect x="15" y="36" width="20" height="2.5" rx="1.2" fill="white" opacity="0.8" />
    {/* "NEW" badge */}
    <rect x="30" y="5" width="16" height="8" rx="4" fill="#fde047" />
    <text x="38" y="11.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#854d0e" fontFamily="sans-serif">NEW</text>
    {/* Shine */}
    <rect x="11" y="9" width="16" height="4" rx="2" fill="white" opacity="0.2" />
  </svg>
);

const IconChatSupport = () => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
    <defs>
      <linearGradient id="cs1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <filter id="cssh">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0c4a6e" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Bubble body */}
    <rect x="6" y="10" width="38" height="28" rx="8" fill="url(#cs1)" filter="url(#cssh)" />
    {/* Side depth */}
    <rect x="44" y="14" width="5" height="20" rx="3" fill="#075985" />
    {/* Tail */}
    <polygon points="14,38 8,46 22,38" fill="url(#cs1)" />
    {/* Dots */}
    <circle cx="18" cy="24" r="3.5" fill="white" opacity="0.9" />
    <circle cx="28" cy="24" r="3.5" fill="white" opacity="0.9" />
    <circle cx="38" cy="24" r="3.5" fill="white" opacity="0.9" />
    {/* Shine */}
    <rect x="8" y="12" width="20" height="5" rx="2.5" fill="white" opacity="0.2" />
  </svg>
);

/* ─── Menu config ───────────────────────────────────────────────────────── */

const menuItems = [
  {
    Icon: IconAgencyProfile,
    label: "Agency Profile",
    desc: "View and edit your agency details",
    path: adminPath("/agency-profile"),
    color: "blue",
    bg: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    hover: "hover:from-blue-100 hover:to-blue-200 hover:border-blue-300",
    badge: (s: DashboardSummary) => `${s.momPersonnel} MOM · ${s.galleryImages} photos`,
    badgeColor: "text-blue-600",
  },
  {
    Icon: IconAddMaid,
    label: "Add Maids",
    desc: "Register new maid profiles",
    path: adminPath("/add-maid"),
    color: "emerald",
    bg: "from-emerald-50 to-emerald-100",
    border: "border-emerald-200",
    hover: "hover:from-emerald-100 hover:to-emerald-200 hover:border-emerald-300",
    badge: () => "Register new profiles",
    badgeColor: "text-emerald-600",
  },
  {
    Icon: IconEditMaid,
    label: "Edit / Delete Maids",
    desc: "Manage existing maid records",
    path: adminPath("/edit-maids"),
    color: "orange",
    bg: "from-orange-50 to-orange-100",
    border: "border-orange-200",
    hover: "hover:from-orange-100 hover:to-orange-200 hover:border-orange-300",
    badge: (s: DashboardSummary) => `${s.publicMaids} public · ${s.hiddenMaids} hidden`,
    badgeColor: "text-orange-600",
  },
  {
    Icon: IconChatSupport,
    label: "Chat Support",
    desc: "Reply to client chat messages",
    path: adminPath("/chat-support"),
    color: "sky",
    bg: "from-sky-50 to-sky-100",
    border: "border-sky-200",
    hover: "hover:from-sky-100 hover:to-sky-200 hover:border-sky-300",
    badge: (s: DashboardSummary) => `${s.unreadAgencyChats} unread messages`,
    badgeColor: "text-sky-600",
  },
  {
    Icon: IconChangePassword,
    label: "Change Password",
    desc: "Update your account password",
    path: adminPath("/change-password"),
    color: "violet",
    bg: "from-violet-50 to-violet-100",
    border: "border-violet-200",
    hover: "hover:from-violet-100 hover:to-violet-200 hover:border-violet-300",
    badge: () => "Keep your account secure",
    badgeColor: "text-violet-600",
  },
  {
    Icon: IconContracts,
    label: "Employment Contracts",
    desc: "Access employment documents",
    path: adminPath("/employment-contracts"),
    color: "rose",
    bg: "from-rose-50 to-rose-100",
    border: "border-rose-200",
    hover: "hover:from-rose-100 hover:to-rose-200 hover:border-rose-300",
    badge: () => "Forms & templates",
    badgeColor: "text-rose-600",
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */

const HomePage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/company/summary");
        const data = (await response.json().catch(() => ({}))) as Partial<DashboardSummary> & {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Failed to load dashboard summary");
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
    <>
      {/* Inline styles for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .dashboard-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .card-appear {
          opacity: 0;
          animation: slideUp 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        .header-appear {
          opacity: 0;
          animation: fadeIn 0.4s ease forwards;
        }

        .menu-card {
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.22s ease,
                      border-color 0.2s ease;
        }

        .menu-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 40px -8px rgba(0,0,0,0.14);
        }

        .menu-card:active {
          transform: scale(0.97);
        }

        .icon-3d {
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.18));
          transition: filter 0.22s ease, transform 0.22s ease;
        }

        .menu-card:hover .icon-3d {
          filter: drop-shadow(0 10px 16px rgba(0,0,0,0.26));
          transform: translateY(-2px) scale(1.08);
        }

        .stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(255,255,255,0.65);
          backdrop-filter: blur(4px);
        }

        .header-bar {
          background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fdf4ff 100%);
          border: 1px solid rgba(203,213,225,0.6);
        }
      `}</style>

      <div className="dashboard-root min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-8 lg:px-6 lg:py-10 space-y-6">

          {/* ── Header bar ─────────────────────────────────────────────── */}
          <div
            className="header-bar rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 header-appear"
            style={{ animationDelay: "0s" }}
          >
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage your agency from one place</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="stat-chip">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="text-emerald-700">
                  <b>{summary?.publicMaids ?? "—"}</b> Public
                </span>
              </span>
              <span className="stat-chip">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="text-red-600">
                  <b>{summary?.hiddenMaids ?? "—"}</b> Hidden
                </span>
              </span>
              {summary && (
                <span className="stat-chip">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                  <span className="text-sky-700">
                    <b>{summary.unreadAgencyChats}</b> Unread
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* ── Menu grid ──────────────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item, i) => (
              <Link
                key={item.label}
                to={item.path}
                className={`menu-card card-appear block rounded-2xl border bg-gradient-to-br ${item.bg} ${item.border} ${item.hover} p-5 no-underline`}
                style={{ animationDelay: `${0.08 + i * 0.07}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* 3-D icon */}
                  <div className="shrink-0 icon-3d">
                    <item.Icon />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[15px] text-slate-800 leading-tight">
                      {item.label}
                    </p>
                    <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                    {summary && (
                      <p className={`text-[11.5px] font-semibold mt-2 ${item.badgeColor}`}>
                        {item.badge(summary)}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg
                    viewBox="0 0 20 20"
                    className="w-4 h-4 text-slate-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;