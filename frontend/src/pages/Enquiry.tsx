import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Trash2 } from "lucide-react";
import { streamSse } from "@/lib/sse";

interface EnquiryRecord {
  id: number;
  username: string;
  date: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

const Enquiry = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const enquiriesRef = useRef<EnquiryRecord[]>([]);
  const searchRef = useRef("");

  useEffect(() => { enquiriesRef.current = enquiries; }, [enquiries]);
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/enquiries${params.toString() ? `?${params.toString()}` : ""}`, { signal: controller.signal });
        const data = (await response.json()) as { error?: string; enquiries?: EnquiryRecord[] };
        if (!response.ok || !data.enquiries) throw new Error(data.error || "Failed to load enquiries");
        setEnquiries([...data.enquiries].sort((a, b) => b.id - a.id));
        setPage(1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          toast.error(error instanceof Error ? error.message : "Failed to load enquiries");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;
    let pollTimer: number | null = null;
    const computeLocalLastId = () => enquiriesRef.current.reduce((m, e) => Math.max(m, e.id), 0);
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    const loadLastId = async () => {
      try {
        const res = await fetch("/api/enquiries/last-id", { signal: controller.signal });
        const d = (await res.json().catch(() => ({}))) as { lastId?: number };
        if (res.ok && typeof d.lastId === "number") lastId = Math.max(lastId, d.lastId);
      } catch { /* ignore */ } finally { lastId = Math.max(lastId, computeLocalLastId()); }
    };
    const run = async () => {
      await loadLastId();
      while (!controller.signal.aborted) {
        try {
          await streamSse(`/api/enquiries/stream?afterId=${lastId}`, {
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event !== "enquiry" || !event.data) return;
              const payload = JSON.parse(event.data) as { enquiry?: EnquiryRecord };
              const next = payload.enquiry;
              if (!next) return;
              lastId = Math.max(lastId, next.id);
              if (searchRef.current.trim()) return;
              setEnquiries((prev) => {
                if (prev.some((item) => item.id === next.id)) return prev;
                return [...prev, next].sort((a, b) => b.id - a.id);
              });
            },
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof Error && /Stream failed \((404|405)\)/.test(error.message)) {
            if (pollTimer !== null) return;
            pollTimer = window.setInterval(async () => {
              if (controller.signal.aborted || searchRef.current.trim()) return;
              try {
                const res = await fetch("/api/enquiries", { signal: controller.signal });
                const d = (await res.json().catch(() => ({}))) as { enquiries?: EnquiryRecord[] };
                if (res.ok && d.enquiries) {
                  setEnquiries([...d.enquiries].sort((a, b) => b.id - a.id));
                  setPage(1);
                  lastId = Math.max(lastId, d.enquiries.reduce((m, e) => Math.max(m, e.id), 0));
                }
              } catch { /* ignore */ }
            }, 5000);
            await sleep(10);
            continue;
          }
          await sleep(1200);
        }
      }
    };
    void run();
    return () => { controller.abort(); if (pollTimer !== null) window.clearInterval(pollTimer); };
  }, []);

  const totalPages = Math.max(1, Math.ceil(enquiries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visibleEnquiries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return enquiries.slice(start, start + PAGE_SIZE);
  }, [currentPage, enquiries]);

  const handleDelete = async (id: number) => {
    try {
      setBusyId(id);
      const response = await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to delete enquiry");
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Enquiry deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enquiry");
    } finally {
      setBusyId(null);
    }
  };

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 20) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="page-container">
      <div className="content-card animate-fade-in-up">
        {/* Title */}
        <h2 className="mb-3 text-center text-xl font-bold text-foreground">Employer Enquiry</h2>

        {/* Search bar */}
        <div className="mb-3 flex gap-2 justify-center items-center">
          <Input
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm text-sm"
          />
        </div>

        {/* Top pagination */}
        <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm justify-center">
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`min-w-[1.5rem] rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  p === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "text-primary underline hover:no-underline hover:bg-muted"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading enquiries…</div>
        ) : enquiries.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No enquiries found.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border border-border px-3 py-2 text-center text-xs font-semibold text-primary">Username</th>
                  <th className="border border-border px-3 py-2 text-center text-xs font-semibold text-primary">Date</th>
                  <th className="border border-border px-3 py-2 text-center text-xs font-semibold text-primary">Email</th>
                  <th className="border border-border px-3 py-2 text-center text-xs font-semibold text-primary">Phone</th>
                  <th className="border border-border px-3 py-2 text-center text-xs font-semibold text-primary">Message</th>
                </tr>
              </thead>
              <tbody>
                {visibleEnquiries.map((enq, i) => (
                  <tr
                    key={enq.id}
                    className="align-top transition-colors hover:bg-muted/30"
                    style={{
                      animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
                      animationDelay: `${i * 0.05}s`,
                      opacity: 0,
                    }}
                  >
                    <td className="border border-border px-3 py-2 align-middle text-xs font-medium">
                      {enq.username}
                    </td>
                    <td className="border border-border px-3 py-2 align-middle text-xs text-muted-foreground whitespace-pre-line">
                      {enq.date}
                    </td>
                    <td className="border border-border px-3 py-2 align-middle text-xs break-all">
                      {enq.email}
                    </td>
                    <td className="border border-border px-3 py-2 align-middle text-xs">
                      {enq.phone}
                    </td>
                    <td className="border border-border px-3 py-2 text-xs leading-relaxed whitespace-pre-line max-w-xs">
                      {enq.message}
                    </td>
                  
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`b-ellipsis-${idx}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[1.5rem] rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                    p === currentPage
                      ? "bg-primary text-primary-foreground"
                      : "text-primary underline hover:no-underline hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Enquiry;