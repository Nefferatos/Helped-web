import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MaidForm from "@/components/MaidForm";
import { toast } from "@/components/ui/sonner";
import { adminPath } from "@/lib/routes";
import { defaultMaidProfile, type MaidProfile } from "@/lib/maids";

const AddMaid = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (payload: MaidProfile) => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/maids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to create maid");
      }
      toast.success("Maid created");
      navigate(adminPath(`/maid/${encodeURIComponent(data.maid.referenceCode)}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create maid");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return <MaidForm initialValue={defaultMaidProfile} mode="create" isSubmitting={isSubmitting} onSubmit={handleSubmit} />;
};

export default AddMaid;

