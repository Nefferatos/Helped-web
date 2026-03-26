import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { getClientToken, getStoredClient } from "@/lib/clientAuth";
import { submitHiringRequest } from "@/lib/agencies";
import { getPrimaryPhoto, getPublicIntro, type MaidProfile } from "@/lib/maids";
import "../ClientPage/ClientTheme.css";

type HiringFormData = Record<string, string> & {
  scheduleStart: string;
  scheduleEnd: string;
  address: string;
  salaryOffer: string;
  offDayPreference: string;
  terms: string;
  specialRequirements: string;
};

const HiringProcessPage = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [formData, setFormData] = useState<HiringFormData>({
    scheduleStart: "",
    scheduleEnd: "",
    address: "",
    salaryOffer: "",
    offDayPreference: "Sunday",
    terms: "",
    specialRequirements: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getClientToken()) {
      toast.error("Please log in as a client to continue with hiring");
      navigate("/employer-login");
      return;
    }

    if (!refCode) return;

    const loadMaid = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/maids/${encodeURIComponent(refCode)}`);
        const data = (await response.json().catch(() => ({}))) as { maid?: MaidProfile; error?: string };
        if (!response.ok || !data.maid) {
          throw new Error(data.error || "Maid not found");
        }

        setMaid(data.maid);
        setFormData((prev) => ({
          ...prev,
          salaryOffer: String(
            ((data.maid.introduction as Record<string, unknown> | undefined)?.expectedSalary as string) || "",
          ),
          terms: String(((data.maid.introduction as Record<string, unknown> | undefined)?.publicIntro as string) || ""),
        }));
      } catch {
        toast.error("Failed to load maid details");
        navigate("/agencies");
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaid();
  }, [navigate, refCode]);

  const handleInputChange = (field: keyof HiringFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const termsPreview = useMemo(
    () => [
      "Agency will review your submitted request before final confirmation.",
      "The maid profile remains subject to final availability at the time of approval.",
      "You may be contacted for verification of address, start date, and household requirements.",
    ],
    [],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!refCode || !maid) return;

    try {
      setIsSubmitting(true);
      await submitHiringRequest(refCode, formData);
      setIsSubmitted(true);
      toast.success("Hiring request submitted. Status is now pending approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit hiring request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="client-page-theme min-h-screen">
        <div className="container py-16 text-center">Loading...</div>
      </div>
    );
  }

  if (!maid) {
    return null;
  }

  const photo = getPrimaryPhoto(maid);
  const client = getStoredClient();

  return (
    <div className="client-page-theme min-h-screen">
      <div className="container py-12">
        <Link to={`/maids/${refCode}`} className="mb-8 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Maid Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="overflow-hidden rounded-xl border bg-muted">
                {photo ? (
                  <img src={photo} alt={maid.fullName} className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No photo available</div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">{maid.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {maid.referenceCode} • {maid.nationality} • {maid.type}
                </p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {getPublicIntro(maid) || "Public introduction will be added soon."}
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p>
                  <span className="font-medium">Client:</span> {client?.name || "Signed-in client"}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {client?.email || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Status after submit:</span> Pending Approval
                </p>
              </div>
              <div className="rounded-xl border bg-accent/10 p-4 text-sm text-muted-foreground">
                This step is client-only. Agency management stays in the restricted admin panel and does not appear here.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Complete Hiring Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Terms and Conditions</p>
                    <ul className="mt-3 space-y-2">
                      {termsPreview.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.scheduleStart}
                        onChange={(event) => handleInputChange("scheduleStart", event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>End Date (optional)</Label>
                      <Input
                        type="date"
                        value={formData.scheduleEnd}
                        onChange={(event) => handleInputChange("scheduleEnd", event.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Service Address</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(event) => handleInputChange("address", event.target.value)}
                      placeholder="Full address where the maid will work"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label>Salary Offer (SGD)</Label>
                      <Input
                        type="number"
                        value={formData.salaryOffer}
                        onChange={(event) => handleInputChange("salaryOffer", event.target.value)}
                        placeholder="e.g. 900"
                        required
                      />
                    </div>
                    <div>
                      <Label>Off Day Preference</Label>
                      <Select value={formData.offDayPreference} onValueChange={(value) => handleInputChange("offDayPreference", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Terms</Label>
                    <Textarea
                      value={formData.terms}
                      onChange={(event) => handleInputChange("terms", event.target.value)}
                      placeholder="Contract terms, household duties, and expectations"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Special Requirements</Label>
                    <Textarea
                      value={formData.specialRequirements}
                      onChange={(event) => handleInputChange("specialRequirements", event.target.value)}
                      placeholder="Any dietary, childcare, eldercare, or schedule-specific requirements"
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold">Request Submitted</h3>
                  <p className="mb-6 text-muted-foreground">
                    Your request is now pending approval. The agency can review the client assignment and follow up with confirmation.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                      <Link to="/client/dashboard">Go to Client Dashboard</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/agencies">Browse More Agencies</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HiringProcessPage;
