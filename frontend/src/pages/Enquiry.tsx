import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Trash2 } from "lucide-react";

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

        setEnquiries(data.enquiries);
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
      <h2 className="mb-6 text-xl font-bold">Employer Enquiry</h2>
      <div className="content-card animate-fade-in-up space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Search enquiry" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline">Search</Button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading enquiries...</div>
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
                    <span className="text-xs text-muted-foreground">{enq.date}</span>
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
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{enq.email}</span>
                  <span>{enq.phone}</span>
                </div>
                <p className="mt-1 whitespace-pre-line rounded bg-muted/50 p-3 text-sm">{enq.message}</p>
              </div>
            ))}

            {!isLoading && visibleEnquiries.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">No enquiries found.</div>
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
