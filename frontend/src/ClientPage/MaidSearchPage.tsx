import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateAge, MaidProfile } from "@/lib/maids";
import { filterMaids } from "@/lib/maidFilter";
import { toast } from "@/components/ui/sonner";


const MAID_TYPES = ["New Maid", "Transfer Maid", "Ex-Singapore Maid"] as const;
const PAGE_SIZE = 18;

const NATIONALITY_LINKS = [
  "Most Recent Maid in 3 days",
  "English Speaking Maid",
  "Mandarin Speaking Maid",
  "Hokkien/Cantonese Speaking",
  "New Maid",
  "Transfer Maid",
  "Ex-Singapore Maid",
  "Filipino Maid",
  "Indonesian Maid",
  "Myanmar Maid",
  "Indian Maid",
  "Mizoram Maid",
  "Darjeeling Maid",
  "Manipur Maid",
  "Punjabi Maid",
  "Sri Lankan Maid",
  "Cambodian Maid",
  "Bangladeshi Maid",
];

const EDUCATION_OPTIONS = [
  "No Preference",
  "Primary (<=6 yrs)",
  "Secondary (>=8 yrs)",
  "College/Degree (>=12 yrs)",
];

const LANGUAGE_OPTIONS = [
  "No Preference",
  "English",
  "Mandarin",
  "Hokkien",
  "Cantonese",
  "Malay",
  "Tamil",
];

const AGE_OPTIONS = [
  "No Preference",
  "21 to 25",
  "26 to 30",
  "31 to 35",
  "36 to 40",
  "41 to 45",
  "46 to 50",
  "51+",
];


const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0]
    : maid.photoDataUrl || "";

const getTypeLabel = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("new")) return "NEW";
  if (t.includes("transfer")) return "TRANSFER";
  if (t.includes("ex")) return "EX-SG";
  return type.toUpperCase();
};


const useShortlist = () => {
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const toggle = (ref: string) =>
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  return { shortlist, toggle };
};


const pageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};


const MaidSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [maidType, setMaidType] = useState<string>(searchParams.get("type") || "");
  const [offDays, setOffDays] = useState(false);
  const [withVideo, setWithVideo] = useState(false);
  const [nationality, setNationality] = useState(searchParams.get("nationality") || "No Preference");
  const [education, setEducation] = useState("No Preference");
  const [language, setLanguage] = useState("No Preference");
  const [age, setAge] = useState("No Preference");
  const [page, setPage] = useState(1);

  const [allMaids, setAllMaids] = useState<MaidProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { shortlist, toggle: toggleShortlist } = useShortlist();

  const nationalityOptions = useMemo(() => {
    const vals = Array.from(
      new Set(allMaids.map((m) => m.nationality?.trim()).filter(Boolean) as string[])
    ).sort();
    return ["No Preference", ...vals];
  }, [allMaids]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/maids?visibility=public", { signal: controller.signal });
        const data = (await res.json()) as { maids?: MaidProfile[]; error?: string };
        if (!res.ok || !data.maids) throw new Error(data.error || "Failed to load");
        setAllMaids(data.maids.filter((m) => m.isPublic));
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError"))
          toast.error(err instanceof Error ? err.message : "Failed to load maids");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const filteredMaids = useMemo(() => {
    let result = filterMaids(allMaids, {
      keyword,
      nationality: nationality === "No Preference" ? [] : [nationality],
      maidTypes: maidType ? [maidType] : [],
    });
    if (age !== "No Preference") {
      const [minAge, maxAge] = age.includes("+")
        ? [parseInt(age), 999]
        : age.split(" to ").map(Number);
      result = result.filter((m) => {
        const a = calculateAge(m.dateOfBirth);
        return a !== null && a >= minAge && (maxAge === 999 ? true : a <= maxAge);
      });
    }
    return result;
  }, [allMaids, keyword, maidType, nationality, offDays, withVideo, age]);

  const totalPages = Math.max(1, Math.ceil(filteredMaids.length / PAGE_SIZE));
  const pagedMaids = filteredMaids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = () => {
    setPage(1);
  };

  const handleNatLink = (label: string) => {
    const nat = label.replace(" Maid", "").replace(" Speaking", "").trim();
    const typeMap: Record<string, string> = {
      "New": "New Maid",
      "Transfer": "Transfer Maid",
      "Ex-Singapore": "Ex-Singapore Maid",
    };
    if (typeMap[nat]) { setMaidType(typeMap[nat]); setNationality("No Preference"); }
    else { setNationality(nat); setMaidType(""); }
    setPage(1);
  };

  const pages = pageNumbers(page, totalPages);

  // ── sidebar ────────────────────────────────────────────────────────────────

  const Sidebar = () => (
    <aside className="w-full shrink-0 md:w-52 lg:w-56">
      {/* Search box */}
      <div className="mb-3 rounded border border-border bg-card p-3">
        <p className="mb-2 font-display text-sm font-bold text-primary">Maid Search</p>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Filipino maid, baby sitter, etc."
          className="mb-2 w-full rounded border border-border bg-background px-2 py-1.5 font-body text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />

        <p className="mb-1.5 font-body text-xs font-semibold text-foreground">Maid Type</p>
        <div className="mb-3 space-y-1">
          {MAID_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 font-body text-xs text-foreground select-none">
              <input
                type="radio"
                name="maidType"
                checked={maidType === t}
                onChange={() => setMaidType(maidType === t ? "" : t)}
                className="accent-primary"
              />
              {t}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 font-body text-xs text-foreground select-none">
            <input type="checkbox" checked={offDays} onChange={(e) => setOffDays(e.target.checked)} className="accent-primary" />
            Willing to work on off-days
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-body text-xs text-foreground select-none">
            <input type="checkbox" checked={withVideo} onChange={(e) => setWithVideo(e.target.checked)} className="accent-primary" />
            Maid With Video
            <span className="rounded bg-red-500 px-1 py-px text-[9px] font-bold text-white">▶</span>
          </label>
        </div>

        <div className="mb-2 space-y-1.5">
          {[
            { label: "Nationality", value: nationality, options: nationalityOptions, set: setNationality },
            { label: "Education", value: education, options: EDUCATION_OPTIONS, set: setEducation },
            { label: "Language", value: language, options: LANGUAGE_OPTIONS, set: setLanguage },
            { label: "Age", value: age, options: AGE_OPTIONS, set: setAge },
          ].map(({ label, value, options, set }) => (
            <div key={label} className="flex items-center gap-1.5">
              <label className="w-20 shrink-0 font-body text-xs font-semibold text-foreground">{label}</label>
              <select
                value={value}
                onChange={(e) => { set(e.target.value); setPage(1); }}
                className="flex-1 rounded border border-border bg-background px-1.5 py-1 font-body text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <button
          onClick={handleSearch}
          className="w-full rounded bg-primary py-2 font-body text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Search Maid
        </button>
      </div>

      {/* Quick nav links */}
      <div className="rounded border border-border bg-card overflow-hidden">
        {NATIONALITY_LINKS.map((link) => (
          <button
            key={link}
            onClick={() => handleNatLink(link)}
            className="flex w-full items-center gap-1.5 border-b border-border/50 px-3 py-2 text-left font-body text-xs text-foreground transition-colors hover:bg-primary/5 hover:text-primary last:border-b-0"
          >
            <span className="text-primary">›</span>
            {link}
          </button>
        ))}
      </div>
    </aside>
  );

  // ── pagination bar ─────────────────────────────────────────────────────────

  const PaginationBar = () => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground hover:bg-muted disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => setPage(p as number)}
            className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded border px-2 text-xs font-medium transition-colors ${
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground hover:bg-muted disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:gap-5 md:py-6">

        <Sidebar />

        <main className="flex-1 min-w-0">

          <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-4 py-2 font-body text-sm text-amber-700">
            You have shortlisted{" "}
            <span className="font-bold text-primary">{shortlist.size}</span>{" "}
            {shortlist.size === 1 ? "maid" : "maids"}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-sm text-muted-foreground">
              Click photo for more details
              {!isLoading && (
                <span className="ml-2 text-xs text-muted-foreground/70">
                  ({filteredMaids.length} result{filteredMaids.length !== 1 ? "s" : ""})
                </span>
              )}
            </p>
            <PaginationBar />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded border bg-muted">
                  <div className="aspect-[3/4] bg-muted/60" />
                  <div className="space-y-1.5 p-2">
                    <div className="h-2 w-3/4 rounded bg-muted-foreground/20" />
                    <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
                    <div className="h-2 w-2/3 rounded bg-muted-foreground/20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMaids.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-display text-base font-semibold text-foreground">No maids found</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Try adjusting your filters or search keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {pagedMaids.map((maid) => {
                const photo = getPrimaryPhoto(maid);
                const age = calculateAge(maid.dateOfBirth);
                const isShortlisted = shortlist.has(maid.referenceCode);
                const typeLower = (maid.type || "").toLowerCase();
                const typeBadgeColor = typeLower.includes("new")
                  ? "bg-emerald-500"
                  : typeLower.includes("transfer")
                  ? "bg-blue-500"
                  : "bg-amber-500";

                return (
                  <article
                    key={maid.referenceCode}
                    className="group flex flex-col overflow-hidden rounded border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative w-full bg-muted">
                      <Link to={`/maids/${encodeURIComponent(maid.referenceCode)}`}>
                        {photo ? (
                          <img
                            src={photo}
                            alt={maid.fullName}
                            className="block h-auto w-full cursor-pointer"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                            <svg className="h-8 w-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                            </svg>
                          </div>
                        )}
                      </Link>

                      <button
                        onClick={() => toggleShortlist(maid.referenceCode)}
                        className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1 font-body text-[9px] font-bold text-white transition-colors ${
                          isShortlisted ? "bg-amber-500" : "bg-primary hover:bg-primary/90"
                        }`}
                      >
                        <Star className={`h-2.5 w-2.5 ${isShortlisted ? "fill-white" : ""}`} />
                        {isShortlisted ? "Shortlisted" : "Add to Shortlist"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-0.5 p-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-body text-[11px] font-semibold leading-tight text-foreground">
                          {maid.nationality || "—"} maid
                        </span>
                        {maid.type && (
                          <span className={`rounded px-1 py-px font-body text-[8px] font-bold uppercase text-white ${typeBadgeColor}`}>
                            {getTypeLabel(maid.type)}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[10px] text-muted-foreground leading-tight">
                        {maid.maritalStatus || "—"}{age !== null ? `(${age})` : ""}
                      </p>
                      
                      <p className="font-mono text-[9px] text-muted-foreground leading-tight">
                        Ref: {maid.referenceCode}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!isLoading && filteredMaids.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-sm text-muted-foreground">
                Click photo for full details
              </p>
              <PaginationBar />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MaidSearchPage;