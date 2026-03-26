import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import type { MaidProfile } from "@/lib/maids";

interface Contract {
  id: string;
  refCode: string;
  clientName: string;
  maidName: string;
  startDate: string;
  salary: string;
  terms: string;
  status: "draft" | "signed" | "completed";
}

interface ContractFormProps {
  onSave: (contract: Omit<Contract, "id">) => void;
  onCancel?: () => void;
  initialData?: Omit<Contract, "id">;
  maidRef?: string;
  maids?: MaidProfile[];
}

const createInitialFormData = (
  initialData?: Omit<Contract, "id">,
  maidRef?: string,
) => ({
  refCode: initialData?.refCode || maidRef || "",
  clientName: initialData?.clientName || "",
  maidName: initialData?.maidName || "",
  startDate: initialData?.startDate || "",
  salary: initialData?.salary || "",
  terms: initialData?.terms || "",
  status: initialData?.status || "draft",
});

const ContractForm = ({ onSave, onCancel, initialData, maidRef, maids = [] }: ContractFormProps) => {
  const [formData, setFormData] = useState<Omit<Contract, "id">>(() =>
    createInitialFormData(initialData, maidRef),
  );

  useEffect(() => {
    setFormData(createInitialFormData(initialData, maidRef));
    setManualMaidSelection(false);
  }, [initialData, maidRef]);

  const selectedMaid = maids.find((maid) => maid.referenceCode === formData.refCode);

  useEffect(() => {
    if (!selectedMaid) return;

    setFormData((prev) => ({
      ...prev,
      refCode: selectedMaid.referenceCode,
      maidName: prev.maidName.trim() ? prev.maidName : selectedMaid.fullName,
      salary:
        prev.salary.trim() ||
        String(
          (selectedMaid.introduction as Record<string, unknown> | undefined)?.expectedSalary || "",
        ),
      terms:
        prev.terms.trim() ||
        String(
          (selectedMaid.introduction as Record<string, unknown> | undefined)?.publicIntro || "",
        ),
    }));
  }, [selectedMaid]);

  const [manualMaidSelection, setManualMaidSelection] = useState(false);

  const handleMaidSelect = (referenceCode: string) => {
    setManualMaidSelection(true);
    const maid = maids.find((item) => item.referenceCode === referenceCode);

    setFormData((prev) => ({
      ...prev,
      refCode: referenceCode,
      maidName: maid?.fullName || prev.maidName,
      salary:
        maid && !prev.salary.trim()
          ? String(
              (maid.introduction as Record<string, unknown> | undefined)?.expectedSalary || "",
            )
          : prev.salary,
      terms:
        maid && !prev.terms.trim()
          ? String((maid.introduction as Record<string, unknown> | undefined)?.publicIntro || "")
          : prev.terms,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.maidName || !formData.startDate || !formData.salary) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Employment Contract" : "Create Employment Contract"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Select Maid</Label>
            <Select value={formData.refCode} onValueChange={handleMaidSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a maid to auto-fill contract details" />
              </SelectTrigger>
              <SelectContent>
                {maids.length === 0 ? (
                  <SelectItem value="no-maids" disabled>
                    No maids available
                  </SelectItem>
                ) : (
                  maids.map((maid) => (
                    <SelectItem key={maid.referenceCode} value={maid.referenceCode}>
                      {maid.fullName} ({maid.referenceCode})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Maid Ref Code</Label>
            <Input value={formData.refCode} onChange={(e) => handleChange("refCode", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client Name</Label>
              <Input value={formData.clientName} onChange={(e) => handleChange("clientName", e.target.value)} required />
            </div>
            <div>
              <Label>Maid Name</Label>
              <Input value={formData.maidName} onChange={(e) => handleChange("maidName", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => handleChange("startDate", e.target.value)} required />
            </div>
            <div>
              <Label>Salary (SGD)</Label>
              <Input type="number" value={formData.salary} onChange={(e) => handleChange("salary", e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea rows={6} value={formData.terms} onChange={(e) => handleChange("terms", e.target.value)} />
          </div>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {initialData ? "Update Contract" : "Save Contract"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
          {selectedMaid && manualMaidSelection ? (
            <p className="text-sm text-muted-foreground">
              Maid details were auto-filled from {selectedMaid.fullName}. You can still edit the fields manually.
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};

export default ContractForm;

