import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 5;

const Enquiry = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const enquiriesRef = useRef<EnquiryRecord[]>([]);
  const searchRef = useRef("");

  useEffect(() => {
    enquiriesRef.current = enquiries;
  }, [enquiries]);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    const loadEnquiries = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(`/api/enquiries${params.toString() ? `?${params.toString()}` : ""}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { error?: string; enquiries?: EnquiryRecord[] };

        if (!response.ok || !data.enquiries) {
          throw new Error(data.error || "Failed to load enquiries");
        }

        setEnquiries([...data.enquiries].sort((a, b) => b.id - a.id));
        setPage(1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error(error instanceof Error ? error.message : "Failed to load enquiries");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadEnquiries();
    return () => controller.abort();
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let lastId = 0;
    let pollTimer: number | null = null;

    const computeLocalLastId = () =>
      enquiriesRef.current.reduce((maxId, enquiry) => Math.max(maxId, enquiry.id), 0);

    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const loadLastId = async () => {
      try {
        const response = await fetch("/api/enquiries/last-id", { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as { lastId?: number };
        if (response.ok && typeof data.lastId === "number") {
          lastId = Math.max(lastId, data.lastId);
        }
      } catch {
        // ignore; endpoint may not exist in local dev
      } finally {
        lastId = Math.max(lastId, computeLocalLastId());
      }
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

              if (searchRef.current.trim()) {
                return;
              }

              setEnquiries((prev) => {
                if (prev.some((item) => item.id === next.id)) return prev;
                return [...prev, next].sort((a, b) => b.id - a.id);
              });
            },
          });
        } catch (error) {
          if (controller.signal.aborted) return;

          if (error instanceof Error && /Stream failed \\((404|405)\\)/.test(error.message)) {
            if (pollTimer !== null) return;
            pollTimer = window.setInterval(async () => {
              if (controller.signal.aborted) return;
              if (searchRef.current.trim()) return;
              try {
                const response = await fetch("/api/enquiries", { signal: controller.signal });
                const data = (await response.json().catch(() => ({}))) as { enquiries?: EnquiryRecord[] };
                if (response.ok && data.enquiries) {
                  setEnquiries([...data.enquiries].sort((a, b) => b.id - a.id));
                  setPage(1);
                  lastId = Math.max(lastId, data.enquiries.reduce((max, item) => Math.max(max, item.id), 0));
                }
              } catch {
                // ignore polling errors
              }
            }, 5000);

            await sleep(10);
            continue;
          }

          await sleep(1200);
        }
      }
    };

    void run();
    return () => {
      controller.abort();
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
    };
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
      const response = await fetch(`/api/enquiries/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete enquiry");
      }

      setEnquiries((prev) => prev.filter((enquiry) => enquiry.id !== id));
      toast.success("Enquiry deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enquiry");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-container">
      <h2 className="mb-6 text-xl font-bold">Incoming Enquiries</h2>
      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Search enquiry" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline">Search</Button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-black">Loading enquiries...</div>
        ) : (
          <div className="space-y-3">
            {visibleEnquiries.map((enq, i) => (
              <div
                key={enq.id}
                className="space-y-2 rounded-lg border p-4 transition-colors hover:border-primary/20"
                style={{ animation: "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards", animationDelay: `${i * 0.06}s`, opacity: 0 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-semibold">{enq.username}</span>
                    <span className="text-xs text-black">{enq.date}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busyId === enq.id}
                    onClick={() => void handleDelete(enq.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> {busyId === enq.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black">
                  <span>{enq.email}</span>
                  <span>{enq.phone}</span>
                </div>
                <p className="mt-1 whitespace-pre-line rounded bg-muted/50 p-3 text-sm">{enq.message}</p>
              </div>
            ))}

            {!isLoading && visibleEnquiries.length === 0 && (
              <div className="py-10 text-center text-black">No enquiries found.</div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-1 pt-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-7 w-7 rounded ${i + 1 === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {i + 1}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Enquiry;
