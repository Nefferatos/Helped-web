import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { getClientToken, getStoredClient } from "@/lib/clientAuth";
import { submitHiringRequest } from "@/lib/agencies";
import { calculateAge, getPrimaryPhoto, getPublicIntro, type MaidProfile } from "@/lib/maids";
import "../ClientPage/ClientTheme.css";

type HiringFormData = Record<string, string> & {
  serviceType: string;
  duties: string;
  qualifications: string;
  scheduleStart: string;
  scheduleEnd: string;
  address: string;
  salaryOffer: string;
  offDayPreference: string;
  terms: string;
  specialRequirements: string;
  clarificationNotes: string;
  interviewOption: string;
  chosenCandidateId: string;
};

type CandidateProfile = {
  id: string;
  name: string;
  age: number;
  experience: string;
  skills: string[];
  availability: string;
  note: string;
  isActualProfile: boolean;
};

const stepTitles = [
  "Collect Client Requirements",
  "Confirm and Clarify",
  "Candidate Matching",
  "Interview Coordination",
  "Selection",
  "Contract and Payment",
  "Deployment",
  "Support",
] as const;

const mockNames = [
  "Ana Santos",
  "Lina Devi",
  "Maya Putri",
  "Siti Rahma",
  "Rina Aulia",
  "Priya Nair",
  "Mariam Yusuf",
  "Dewi Kartika",
  "Nora Salim",
  "Asha Kumari",
  "Fatin Zahra",
  "Kusum Lata",
  "Vina Lestari",
  "Shanti Devi",
  "Rosa Mae",
  "Nur Azizah",
  "Jaya Lakshmi",
  "Indah Permata",
  "Rekha Bai",
  "Farah Hana",
  "Mei Lin",
  "Grace Ann",
  "Citra Ayu",
  "Laila Noor",
];

const defaultMockSkills = [
  "Cleaning",
  "Cooking",
  "Childcare",
  "Elderly care",
  "General housekeeping",
  "Infant care",
  "Pet care",
  "Laundry",
];

const getRequestedSkills = (duties: string, fallbackSkills: string[]) => {
  const normalizedDuties = duties
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedDuties.length > 0) {
    return normalizedDuties.slice(0, 4);
  }

  return fallbackSkills.slice(0, 4);
};

const getMaidSkills = (maid: MaidProfile) => {
  const areaSkills = Object.entries(maid.workAreas || {})
    .filter(([, value]) => {
      const config = value as { willing?: boolean; experience?: boolean };
      return Boolean(config.willing || config.experience);
    })
    .map(([key]) => key);

  return Array.from(new Set([...areaSkills, maid.type, maid.nationality].filter(Boolean))).slice(0, 5);
};

const HiringProcessPage = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const navigate = useNavigate();
  const [maid, setMaid] = useState<MaidProfile | null>(null);
  const [formData, setFormData] = useState<HiringFormData>({
    serviceType: "",
    duties: "",
    qualifications: "",
    scheduleStart: "",
    scheduleEnd: "",
    address: "",
    salaryOffer: "",
    offDayPreference: "Sunday",
    terms: "",
    specialRequirements: "",
    clarificationNotes: "",
    interviewOption: "",
    chosenCandidateId: "",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
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
          chosenCandidateId: data.maid.referenceCode,
        }));
        setSelectedCandidateIds([data.maid.referenceCode]);
      } catch {
        toast.error("Failed to load maid details");
        navigate("/agencies");
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaid();
  }, [navigate, refCode]);

  const client = getStoredClient();

  const candidateProfiles = useMemo(() => {
    if (!maid) return [];

    const maidAge = calculateAge(maid.dateOfBirth) ?? 31;
    const maidSkills = getMaidSkills(maid);
    const requestedSkills = getRequestedSkills(formData.duties, maidSkills.length > 0 ? maidSkills : defaultMockSkills);
    const startDateLabel = formData.scheduleStart || "Immediate";

    const primaryProfile: CandidateProfile = {
      id: maid.referenceCode,
      name: maid.fullName,
      age: maidAge,
      experience: `${Math.max(2, Math.min(12, maidAge - 21))} years`,
      skills: requestedSkills.length > 0 ? requestedSkills : maidSkills,
      availability: startDateLabel,
      note: "Current profile in the system",
      isActualProfile: true,
    };

    const mockProfiles = mockNames.map((name, index) => ({
      id: `mock-${index + 1}`,
      name,
      age: 24 + (index % 16),
      experience: `${2 + (index % 9)} years`,
      skills: [
        requestedSkills[index % Math.max(1, requestedSkills.length)] || defaultMockSkills[index % defaultMockSkills.length],
        defaultMockSkills[(index + 2) % defaultMockSkills.length],
        defaultMockSkills[(index + 4) % defaultMockSkills.length],
      ],
      availability: index % 3 === 0 ? startDateLabel : `Within ${3 + (index % 5)} days`,
      note: "Sample matched profile",
      isActualProfile: false,
    }));

    return [primaryProfile, ...mockProfiles].slice(0, 25);
  }, [maid, formData.duties, formData.scheduleStart]);

  const selectedCandidates = useMemo(
    () => candidateProfiles.filter((candidate) => selectedCandidateIds.includes(candidate.id)),
    [candidateProfiles, selectedCandidateIds],
  );

  const chosenCandidate =
    candidateProfiles.find((candidate) => candidate.id === formData.chosenCandidateId) ?? candidateProfiles[0] ?? null;

  const missingSummaryDetails = useMemo(() => {
    const missing: string[] = [];
    if (!formData.serviceType) missing.push("service type");
    if (!formData.duties.trim()) missing.push("duties");
    if (!formData.qualifications.trim()) missing.push("preferred qualifications");
    if (!formData.scheduleStart) missing.push("start date");
    if (!formData.salaryOffer.trim()) missing.push("budget");
    return missing;
  }, [formData]);

  const handleInputChange = (field: keyof HiringFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId) ? prev.filter((item) => item !== candidateId) : [...prev, candidateId],
    );
  };

  const canContinueFromStep = (step: number) => {
    switch (step) {
      case 1:
        return Boolean(
          formData.serviceType &&
            formData.duties.trim() &&
            formData.qualifications.trim() &&
            formData.scheduleStart &&
            formData.salaryOffer.trim(),
        );
      case 2:
        return missingSummaryDetails.length === 0;
      case 3:
        return candidateProfiles.length === 25;
      case 4:
        return selectedCandidateIds.length > 0 && Boolean(formData.interviewOption);
      case 5:
        return Boolean(formData.chosenCandidateId);
      case 6:
        return true;
      case 7:
        return Boolean(formData.scheduleStart);
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!canContinueFromStep(currentStep)) {
      if (currentStep === 1) {
        toast.error("Please complete all required requirement fields before continuing.");
      } else if (currentStep === 4) {
        toast.error("Please choose at least one candidate and an interview option.");
      }
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, stepTitles.length));
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!refCode || !maid || !chosenCandidate) return;

    try {
      setIsSubmitting(true);
      await submitHiringRequest(refCode, maid.agencyId, {
        ...formData,
        selectedCandidates: selectedCandidates.map((candidate) => candidate.name).join(", "),
        chosenCandidateName: chosenCandidate.name,
        chosenCandidateAvailability: chosenCandidate.availability,
        matchMode: "simulated",
      });
      setIsSubmitted(true);
      toast.success("Hiring request submitted. The agency can now prepare the next steps.");
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
  const isFinalStep = currentStep === stepTitles.length;

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
              <CardTitle className="text-2xl">Request Overview</CardTitle>
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
                  <span className="font-medium">Current step:</span> {currentStep} of {stepTitles.length}
                </p>
              </div>
              <div className="rounded-xl border bg-accent/10 p-4 text-sm">
                <p className="font-medium text-foreground">Structured flow</p>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  {stepTitles.map((step, index) => (
                    <li key={step} className={index + 1 === currentStep ? "font-medium text-foreground" : ""}>
                      Step {index + 1}: {step}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Step {currentStep}: {stepTitles[currentStep - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isSubmitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold">Request Submitted</h3>
                  <p className="mb-6 text-muted-foreground">
                    Your hiring request has been sent. The agency can now review the selected profile, prepare contract steps,
                    and follow up on payment and deployment.
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
              ) : (
                <>
                  {currentStep === 1 ? (
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Please provide your hiring requirements so the agency can guide the match properly.
                      </p>

                      <div>
                        <Label>Type of Service</Label>
                        <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Stay-in">Stay-in</SelectItem>
                            <SelectItem value="Stay-out">Stay-out</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Duties Required</Label>
                        <Textarea
                          value={formData.duties}
                          onChange={(event) => handleInputChange("duties", event.target.value)}
                          placeholder="Cleaning, cooking, childcare, elderly care, laundry"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Preferred Qualifications</Label>
                        <Textarea
                          value={formData.qualifications}
                          onChange={(event) => handleInputChange("qualifications", event.target.value)}
                          placeholder="Experience, age range, language, or any specific requirement"
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={formData.scheduleStart}
                            onChange={(event) => handleInputChange("scheduleStart", event.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Budget</Label>
                          <Input
                            type="number"
                            value={formData.salaryOffer}
                            onChange={(event) => handleInputChange("salaryOffer", event.target.value)}
                            placeholder="Budget in SGD"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 2 ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">Client Request Summary</p>
                        <ul className="mt-3 space-y-2 text-muted-foreground">
                          <li>Service type: {formData.serviceType}</li>
                          <li>Duties required: {formData.duties}</li>
                          <li>Preferred qualifications: {formData.qualifications}</li>
                          <li>Start date: {formData.scheduleStart}</li>
                          <li>Budget: SGD {formData.salaryOffer}</li>
                        </ul>
                      </div>

                      {missingSummaryDetails.length > 0 ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                          Missing details: {missingSummaryDetails.join(", ")}
                        </div>
                      ) : null}

                      <div>
                        <Label>Follow-up Clarification</Label>
                        <Textarea
                          value={formData.clarificationNotes}
                          onChange={(event) => handleInputChange("clarificationNotes", event.target.value)}
                          placeholder="Add any clarification, special schedule, household setup, or other notes"
                          rows={4}
                        />
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 3 ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Matching candidates will be provided below. These are simulated sample profiles based on your
                        request and the current system profile.
                      </div>

                      <div className="space-y-4">
                        {candidateProfiles.map((candidate) => (
                          <div key={candidate.id} className="rounded-xl border p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">{candidate.name}</p>
                                <p className="text-sm text-muted-foreground">{candidate.note}</p>
                              </div>
                              <span className="rounded-full bg-muted px-3 py-1 text-xs">
                                {candidate.isActualProfile ? "Current profile" : "Sample"}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                              <p>Age: {candidate.age}</p>
                              <p>Experience: {candidate.experience}</p>
                              <p>Skills: {candidate.skills.join(", ")}</p>
                              <p>Availability: {candidate.availability}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 4 ? (
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Please select the candidates you want to interview and choose the preferred interview method.
                      </p>

                      <div className="space-y-3">
                        {candidateProfiles.map((candidate) => {
                          const isChecked = selectedCandidateIds.includes(candidate.id);
                          return (
                            <label
                              key={candidate.id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 hover:bg-muted/20"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                              />
                              <div className="text-sm">
                                <p className="font-medium text-foreground">{candidate.name}</p>
                                <p className="text-muted-foreground">
                                  {candidate.age} years old • {candidate.experience} • {candidate.availability}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div>
                        <Label>Interview Option</Label>
                        <Select value={formData.interviewOption} onValueChange={(value) => handleInputChange("interviewOption", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interview option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Video call">Video call</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="In-person">In-person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 5 ? (
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Please confirm the candidate you want to move forward with. Availability is shown for quick review.
                      </p>

                      <div className="space-y-3">
                        {selectedCandidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => handleInputChange("chosenCandidateId", candidate.id)}
                            className={`w-full rounded-xl border p-4 text-left ${
                              formData.chosenCandidateId === candidate.id ? "border-primary bg-primary/5" : "hover:bg-muted/20"
                            }`}
                          >
                            <p className="font-semibold">{candidate.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Experience: {candidate.experience} • Skills: {candidate.skills.join(", ")}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">Availability: {candidate.availability}</p>
                          </button>
                        ))}
                      </div>

                      {chosenCandidate ? (
                        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                          <p className="font-medium text-foreground">Selected Candidate</p>
                          <p className="mt-2 text-muted-foreground">
                            {chosenCandidate.name} is marked with availability: {chosenCandidate.availability}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {currentStep === 6 ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Contract preparation and payment will follow after candidate confirmation. The agency will review the
                        selected profile, prepare the employment contract, and share payment instructions.
                      </div>

                      <div>
                        <Label>Service Address</Label>
                        <Textarea
                          value={formData.address}
                          onChange={(event) => handleInputChange("address", event.target.value)}
                          placeholder="Full service address"
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <Label>End Date (optional)</Label>
                          <Input
                            type="date"
                            value={formData.scheduleEnd}
                            onChange={(event) => handleInputChange("scheduleEnd", event.target.value)}
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
                        <Label>Contract Notes</Label>
                        <Textarea
                          value={formData.terms}
                          onChange={(event) => handleInputChange("terms", event.target.value)}
                          placeholder="Contract terms, household duties, and expectations"
                          rows={4}
                        />
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 7 ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">Deployment Confirmation</p>
                        <p className="mt-2 text-muted-foreground">Please confirm the final start date and onboarding expectations.</p>
                      </div>

                      <div>
                        <Label>Confirmed Start Date</Label>
                        <Input
                          type="date"
                          value={formData.scheduleStart}
                          onChange={(event) => handleInputChange("scheduleStart", event.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Onboarding Reminder</Label>
                        <Textarea
                          value={formData.specialRequirements}
                          onChange={(event) => handleInputChange("specialRequirements", event.target.value)}
                          placeholder="House rules, daily schedule, expectations, emergency contacts"
                          rows={4}
                        />
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 8 ? (
                    <div className="space-y-6">
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Post-placement support is available for replacement assistance, concerns, and general feedback after deployment.
                      </div>

                      <div className="rounded-xl border p-4 text-sm">
                        <p className="font-medium text-foreground">Next Steps</p>
                        <ul className="mt-3 space-y-2 text-muted-foreground">
                          <li>Chosen candidate: {chosenCandidate?.name || "Not selected"}</li>
                          <li>Interview option: {formData.interviewOption || "Not selected"}</li>
                          <li>Start date: {formData.scheduleStart || "Not set"}</li>
                          <li>Budget: SGD {formData.salaryOffer || "Not set"}</li>
                          <li>Support after placement: replacement, concerns, and feedback assistance</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-3">
                    <Button type="button" variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1}>
                      Previous
                    </Button>

                    {isFinalStep ? (
                      <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !chosenCandidate}>
                        {isSubmitting ? "Submitting..." : "Submit Hiring Request"}
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleNextStep}>
                        Continue
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HiringProcessPage;
