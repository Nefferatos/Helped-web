import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MaidForm from "@/components/MaidForm";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { MaidProfile, defaultMaidProfile } from "@/lib/maids";

const EditMaid = () => {
  const navigate = useNavigate();
  const { refCode } = useParams();
  const [maid, setMaid] = useState<MaidProfile>(defaultMaidProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadMaid = async () => {
      if (!refCode) {
        toast.error("Missing maid reference code");
        navigate("/edit-maids");
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json()) as { error?: string; maid?: MaidProfile };

        if (!response.ok || !data.maid) {
          throw new Error(data.error || "Failed to load maid");
        }

        setMaid(data.maid);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid");
        navigate("/edit-maids");
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaid();
  }, [navigate, refCode]);

  const handleUpdate = async (payload: MaidProfile) => {
    if (!refCode) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to update maid");
      }

      toast.success("Maid updated successfully");
      navigate(`/maid/${encodeURIComponent(data.maid.referenceCode)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update maid");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-card py-10 text-center text-muted-foreground">Loading maid profile...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-container pb-0">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
      <MaidForm initialValue={maid} mode="edit" isSubmitting={isSubmitting} onSubmit={handleUpdate} />
    </div>
  );
};

export default EditMaid;
