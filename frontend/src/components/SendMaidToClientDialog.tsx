import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaidProfile } from "@/lib/maids";
import { toast } from "@/components/ui/sonner";

interface ClientOption {
  id: number;
  name: string;
  email: string;
  company?: string;
  phone: string;
  enquiryDate: string;
}

interface Props {
  maid: MaidProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType?: "pending" | "interested" | "direct_hire" | "rejected";
  onSuccess?: (maid: MaidProfile) => void;
}

const SendMaidToClientDialog = ({
  maid,
  open,
  onOpenChange,
  actionType = "pending",
  onSuccess,
}: Props) => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedClientId("");
      return;
    }

    const loadClients = async () => {
      try {
        setIsLoadingClients(true);
        const response = await fetch("/api/direct-sales/clients");
        const data = (await response.json().catch(() => ({}))) as { error?: string; clients?: ClientOption[] };
        if (!response.ok || !data.clients) {
          throw new Error(data.error || "Failed to load clients");
        }
        setClients(data.clients);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load clients");
      } finally {
        setIsLoadingClients(false);
      }
    };

    void loadClients();
  }, [open]);

  const handleSubmit = async () => {
    if (!maid) return;
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/direct-sales/${encodeURIComponent(maid.referenceCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(selectedClientId), status: actionType }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        maid?: MaidProfile;
      };

      if (!response.ok || !data.maid) {
        throw new Error(
          data.error ||
            `Failed to ${
              actionType === "interested"
                ? "mark maid as interested"
                : actionType === "direct_hire"
                ? "start direct hire"
                : actionType === "rejected"
                ? "reject maid"
                : "send maid to client"
            }`
        );
      }

      onSuccess?.(data.maid);
      toast.success(
        actionType === "interested"
          ? "Client selected and maid marked as interested"
          : actionType === "direct_hire"
          ? "Client selected and maid marked for direct hire"
          : actionType === "rejected"
          ? "Client selected and maid marked as rejected"
          : "Client selected and maid marked as sent"
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : actionType === "interested"
          ? "Failed to mark maid as interested"
          : actionType === "direct_hire"
          ? "Failed to start direct hire"
          : actionType === "rejected"
          ? "Failed to reject maid"
          : "Failed to send maid to client"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Client</DialogTitle>
          <DialogDescription>
            Choose a client for {maid?.fullName || "this maid"}. This will create a{" "}
            {actionType === "interested"
              ? "direct sale with interested status"
              : actionType === "direct_hire"
              ? "direct hire record with fast process status"
              : actionType === "rejected"
              ? "direct sale record with rejected status"
              : "pending direct sale"}{" "}
            and update the maid status to{" "}
            {actionType === "interested"
              ? "interested"
              : actionType === "direct_hire"
              ? "reserved"
              : actionType === "rejected"
              ? "rejected"
              : "sent"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoadingClients ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              No registered clients available yet. A client must sign up before the admin can assign a maid.
            </div>
          ) : (
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} | {client.email} | {client.phone || "N/A"}
                </option>
              ))}
            </select>
          )}

          {selectedClientId ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {(() => {
                const client = clients.find((item) => String(item.id) === selectedClientId);
                if (!client) return null;
                return (
                  <>
                    <p><span className="font-semibold text-foreground">Client:</span> {client.name}</p>
                    <p><span className="font-semibold text-foreground">Email:</span> {client.email}</p>
                    <p><span className="font-semibold text-foreground">Company:</span> {client.company || "N/A"}</p>
                    <p><span className="font-semibold text-foreground">Phone:</span> {client.phone || "N/A"}</p>
                    <p><span className="font-semibold text-foreground">Joined:</span> {new Date(client.enquiryDate).toLocaleDateString()}</p>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || isLoadingClients || clients.length === 0}>
            {isSubmitting
              ? "Saving..."
              : actionType === "interested"
              ? "Mark Interested"
              : actionType === "direct_hire"
              ? "Start Direct Hire"
              : actionType === "rejected"
              ? "Reject Maid"
              : "Confirm Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMaidToClientDialog;
