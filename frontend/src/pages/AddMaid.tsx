import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { MaidProfile } from "@/lib/maids";

const tabs = ["PROFILE", "SKILLS", "EMPLOYMENT HISTORY", "AVAILABILITY/REMARK", "INTRODUCTION", "PUBLIC INTRODUCTION", "PRIVATE INFO"];
const languageOptions = [
  "English",
  "Mandarin/Chinese-Dialect",
  "Indonesian/Malaysian",
  "Hindi",
  "Tamil",
];
const skillAreas = [
  "Care of infants/children",
  "Care of elderly",
  "Care of disabled",
  "General housework",
  "Cooking",
  "Language Skill",
  "Other Skill",
];
const yesNoQuestions = [
  "Able to handle pork?",
  "Able to eat pork?",
  "Able to care for dog/cat?",
  "Able to do simple sewing?",
  "Able to do gardening work?",
  "Willing to wash car?",
  "Willing to work on off-days with  compensation?",
];
const medicalQuestions = [
  "Mental illness",
  "Epilepsy",
  "Asthma",
  "Diabetes",
  "Hypertension",
  "Tuberculosis",
  "Heart disease",
  "Malaria",
  "Operations",
];
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 12 * 1024 * 1024;

interface AddMaidProps {
  editRefCode?: string;
}

const AddMaid = ({ editRefCode }: AddMaidProps) => {
  const navigate = useNavigate();
  const isEditMode = Boolean(editRefCode);
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMaid, setIsLoadingMaid] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    referenceCode: "",
    type: "New maid",
    nationality: "Filipino maid",
    dateOfBirth: "",
    placeOfBirth: "",
    height: "150",
    weight: "50",
    religion: "Catholic",
    maritalStatus: "Single",
    numberOfChildren: "0",
    numberOfSiblings: "0",
    homeAddress: "",
    airportRepatriation: "",
    educationLevel: "High School (10-12 yrs)",
    offDaysPerMonth: "0",
    passportNo: "",
    homeCountryContactNumber: "",
  });
  const [languageSkills, setLanguageSkills] = useState<Record<string, string>>(
    Object.fromEntries(languageOptions.map((lang) => [lang, lang === "English" ? "Zero" : "Zero"]))
  );
  const [workAreas, setWorkAreas] = useState<Record<string, { willing: boolean; experience: boolean; evaluation: string }>>(
    Object.fromEntries(skillAreas.map((skill) => [skill, { willing: false, experience: false, evaluation: "-" }]))
  );
  const [otherInformation, setOtherInformation] = useState<Record<string, boolean>>(
    Object.fromEntries(yesNoQuestions.map((question) => [question, false]))
  );
  const [employmentHistory, setEmploymentHistory] = useState<Array<Record<string, string>>>([
    { from: "", to: "", country: "", employer: "", duties: "", remarks: "" },
  ]);
  const [availabilityRemark, setAvailabilityRemark] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [publicIntroduction, setPublicIntroduction] = useState("");
  const [privateInfo, setPrivateInfo] = useState("");
  const [medicalInfo, setMedicalInfo] = useState({
    allergies: "",
    physicalDisabilities: "",
    dietaryRestrictions: "",
    foodHandlingPreferences: "",
    pastIllnesses: Object.fromEntries(medicalQuestions.map((question) => [question, false])) as Record<string, boolean>,
    otherIllnesses: "",
    otherRemarks: "",
    noPork: false,
    noBeef: false,
  });
  const [availabilityInfo, setAvailabilityInfo] = useState({
    availability: "",
    contractEnds: "",
    presentSalary: "",
    expectedSalary: "",
    offdayCompensation: "",
  });
  const [privateDetails, setPrivateDetails] = useState({
    agesOfChildren: "",
    maidLoan: "",
  });
  const [agencyContact, setAgencyContact] = useState({
    companyName: "At The Agency (formerly Rinzin Agency Pte. Ltd)",
    licenseNo: "2503114",
    contactPerson: "Bala",
    phone: "80730757",
  });
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const [videoDataUrl, setVideoDataUrl] = useState("");

  const nextLabel = useMemo(
    () => (activeTab < tabs.length - 1 ? "Save and Continue" : isEditMode ? "Update Maid" : "Save Maid"),
    [activeTab, isEditMode]
  );

  const validateBeforeSubmit = () => {
    const missing: string[] = [];

    if (!profile.fullName.trim()) missing.push("Maid Name");
    if (!profile.referenceCode.trim()) missing.push("Ref Code");
    if (!profile.dateOfBirth.trim()) missing.push("Date of Birth");
    if (!profile.placeOfBirth.trim()) missing.push("Place of Birth");
    if (!profile.homeAddress.trim()) missing.push("Address in Home Country");
    if (!profile.airportRepatriation.trim()) missing.push("Airport To Be Repatriated");
    if (photoDataUrls.length === 0) missing.push("At least 1 Photo");

    return missing;
  };

  useEffect(() => {
    const loadForEdit = async () => {
      if (!editRefCode) return;
      try {
        setIsLoadingMaid(true);
        const response = await fetch(`/api/maids/${encodeURIComponent(editRefCode)}`);
        const data = (await response.json()) as { error?: string; maid?: MaidProfile };
        if (!response.ok || !data.maid) throw new Error(data.error || "Failed to load maid");
        const existing = data.maid;

        setProfile((prev) => ({
          ...prev,
          fullName: existing.fullName || "",
          referenceCode: existing.referenceCode || "",
          type: existing.type || prev.type,
          nationality: existing.nationality || prev.nationality,
          dateOfBirth: existing.dateOfBirth || "",
          placeOfBirth: existing.placeOfBirth || "",
          height: String(existing.height || prev.height),
          weight: String(existing.weight || prev.weight),
          religion: existing.religion || prev.religion,
          maritalStatus: existing.maritalStatus || prev.maritalStatus,
          numberOfChildren: String(existing.numberOfChildren ?? 0),
          numberOfSiblings: String(existing.numberOfSiblings ?? 0),
          homeAddress: existing.homeAddress || "",
          airportRepatriation: existing.airportRepatriation || "",
          educationLevel: existing.educationLevel || prev.educationLevel,
          offDaysPerMonth: String(
            (existing.skillsPreferences as Record<string, unknown>)?.offDaysPerMonth ?? prev.offDaysPerMonth
          ),
          passportNo: String((existing.agencyContact as Record<string, unknown>)?.passportNo || ""),
          homeCountryContactNumber: String(
            (existing.agencyContact as Record<string, unknown>)?.homeCountryContactNumber || ""
          ),
        }));

        if (existing.languageSkills) setLanguageSkills(existing.languageSkills);
        if (existing.workAreas) setWorkAreas(existing.workAreas as Record<string, { willing: boolean; experience: boolean; evaluation: string }>);

        const skillsPrefs = (existing.skillsPreferences as Record<string, unknown>) || {};
        setAvailabilityRemark(String(skillsPrefs.availabilityRemark || ""));
        setPrivateInfo(String(skillsPrefs.privateInfo || ""));
        setOtherInformation(
          ((skillsPrefs.otherInformation as Record<string, boolean>) ??
            Object.fromEntries(yesNoQuestions.map((question) => [question, false]))) as Record<string, boolean>
        );

        if (Array.isArray(existing.employmentHistory) && existing.employmentHistory.length > 0) {
          setEmploymentHistory(existing.employmentHistory as Array<Record<string, string>>);
        }

        const intro = (existing.introduction as Record<string, unknown>) || {};
        setIntroduction(String(intro.intro || ""));
        setPublicIntroduction(String(intro.publicIntro || ""));
        setMedicalInfo((prev) => ({
          ...prev,
          allergies: String(intro.allergies || ""),
          physicalDisabilities: String(intro.physicalDisabilities || ""),
          dietaryRestrictions: String(intro.dietaryRestrictions || ""),
          foodHandlingPreferences: String(intro.foodHandlingPreferences || ""),
          pastIllnesses: (intro.pastIllnesses as Record<string, boolean>) || prev.pastIllnesses,
          otherIllnesses: String(intro.otherIllnesses || ""),
          otherRemarks: String(intro.otherRemarks || ""),
          noPork: Boolean(intro.noPork),
          noBeef: Boolean(intro.noBeef),
        }));
        setAvailabilityInfo({
          availability: String(intro.availability || ""),
          contractEnds: String(intro.contractEnds || ""),
          presentSalary: String(intro.presentSalary || ""),
          expectedSalary: String(intro.expectedSalary || ""),
          offdayCompensation: String(intro.offdayCompensation || ""),
        });
        setPrivateDetails({
          agesOfChildren: String(intro.agesOfChildren || ""),
          maidLoan: String(intro.maidLoan || ""),
        });

        const agency = (existing.agencyContact as Record<string, unknown>) || {};
        setAgencyContact({
          companyName: String(agency.companyName || ""),
          licenseNo: String(agency.licenseNo || ""),
          contactPerson: String(agency.contactPerson || ""),
          phone: String(agency.phone || ""),
        });

        const photos =
          Array.isArray(existing.photoDataUrls) && existing.photoDataUrls.length > 0
            ? existing.photoDataUrls
            : existing.photoDataUrl
            ? [existing.photoDataUrl]
            : [];
        setPhotoDataUrls(photos);
        setVideoDataUrl(String(existing.videoDataUrl || ""));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load maid");
        navigate("/edit-maids");
      } finally {
        setIsLoadingMaid(false);
      }
    };

    void loadForEdit();
  }, [editRefCode, navigate]);

  const handleProfileChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateWorkArea = (skill: string, field: "willing" | "experience" | "evaluation", value: boolean | string) => {
    setWorkAreas((prev) => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        [field]: value,
      },
    }));
  };

  const updateEmploymentRow = (index: number, field: string, value: string) => {
    setEmploymentHistory((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addEmploymentRow = () => {
    setEmploymentHistory((prev) => [...prev, { from: "", to: "", country: "", employer: "", duties: "", remarks: "" }]);
  };

  const removeLastEmploymentRow = () => {
    setEmploymentHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const handleAddPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image is too large. Please use files under 5MB.");
      return;
    }
    if (photoDataUrls.length >= MAX_PHOTOS) {
      toast.error("Maximum 5 photos allowed");
      return;
    }

    try {
      setIsProcessingPhoto(true);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      setPendingPhotoDataUrl(dataUrl);
    } catch {
      toast.error("Failed to process image");
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleVideoUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      toast.error("Video is too large. Please use a file smaller than 12MB.");
      return;
    }

    try {
      setIsProcessingVideo(true);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read video"));
        reader.readAsDataURL(file);
      });
      setVideoDataUrl(dataUrl);
      toast.success(videoDataUrl ? "Video updated in form" : "Video added to form");
    } catch {
      toast.error("Failed to process video");
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const buildPayload = (): MaidProfile => ({
    fullName: profile.fullName,
    referenceCode: profile.referenceCode,
    type: profile.type,
    nationality: profile.nationality,
    dateOfBirth: profile.dateOfBirth,
    placeOfBirth: profile.placeOfBirth,
    height: Number(profile.height) || 0,
    weight: Number(profile.weight) || 0,
    religion: profile.religion,
    maritalStatus: profile.maritalStatus,
    numberOfChildren: Number(profile.numberOfChildren) || 0,
    numberOfSiblings: Number(profile.numberOfSiblings) || 0,
    homeAddress: profile.homeAddress,
    airportRepatriation: profile.airportRepatriation,
    educationLevel: profile.educationLevel,
    languageSkills,
    skillsPreferences: {
      availabilityRemark,
      privateInfo,
      offDaysPerMonth: profile.offDaysPerMonth,
      otherInformation,
    },
    workAreas,
    employmentHistory,
    introduction: {
      intro: introduction,
      publicIntro: publicIntroduction,
      allergies: medicalInfo.allergies,
      physicalDisabilities: medicalInfo.physicalDisabilities,
      dietaryRestrictions: medicalInfo.dietaryRestrictions,
      foodHandlingPreferences: medicalInfo.foodHandlingPreferences,
      noPork: medicalInfo.noPork,
      noBeef: medicalInfo.noBeef,
      pastIllnesses: medicalInfo.pastIllnesses,
      otherIllnesses: medicalInfo.otherIllnesses,
      otherRemarks: medicalInfo.otherRemarks,
      availability: availabilityInfo.availability,
      contractEnds: availabilityInfo.contractEnds,
      presentSalary: availabilityInfo.presentSalary,
      expectedSalary: availabilityInfo.expectedSalary,
      offdayCompensation: availabilityInfo.offdayCompensation,
      agesOfChildren: privateDetails.agesOfChildren,
      maidLoan: privateDetails.maidLoan,
    },
    agencyContact: {
      ...agencyContact,
      passportNo: profile.passportNo,
      homeCountryContactNumber: profile.homeCountryContactNumber,
    },
    photoDataUrls,
    photoDataUrl: photoDataUrls[0] || "",
    videoDataUrl,
    isPublic: false,
    hasPhoto: photoDataUrls.length > 0,
  });

  const handleContinue = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab((prev) => prev + 1);
      return;
    }
    void handleSubmit();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const missingFields = validateBeforeSubmit();
    if (missingFields.length > 0) {
      toast.error(`Please fill required fields: ${missingFields.join(", ")}`);
      setActiveTab(0);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      const response = await fetch(isEditMode ? `/api/maids/${encodeURIComponent(editRefCode as string)}` : "/api/maids", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; maid?: MaidProfile };
      if (!response.ok || !data.maid) {
        throw new Error(data.error || "Failed to create maid");
      }

      toast.success(isEditMode ? "Maid updated successfully" : "Maid created successfully");
      navigate(`/maid/${encodeURIComponent(data.maid.referenceCode)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create maid");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold">{isEditMode ? "Edit Maid" : "Add Maid"}</h2>
      </div>

      {isLoadingMaid && (
        <div className="content-card py-10 text-center text-black">Loading maid profile...</div>
      )}

      {!isLoadingMaid && (
      <>

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === i ? "bg-primary text-white shadow" : "bg-muted text-black hover:bg-muted/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="content-card animate-fade-in-up space-y-6">
          <h3 className="text-center text-lg font-bold">(A) PROFILE OF FDW</h3>

          <div className="section-header">Maid Photos (1-5)</div>
          <div className="pt-2">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex h-28 w-24 items-center justify-center overflow-hidden rounded border bg-muted text-xs text-black">
                {photoDataUrls[0] ? (
                  <>
                    <img src={photoDataUrls[0]} alt="Primary maid" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white"
                      onClick={() => setPhotoDataUrls((prev) => prev.slice(1))}
                    >
                      X
                    </button>
                  </>
                ) : (
                  "No Photo"
                )}
              </div>
              {photoDataUrls.slice(1).map((src, index) => (
                <div key={src} className="relative h-28 w-24 overflow-hidden rounded border">
                  <img src={src} alt={`Maid ${index + 2}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white"
                    onClick={() =>
                      setPhotoDataUrls((prev) => prev.filter((_, photoIndex) => photoIndex !== index + 1))
                    }
                  >
                    X
                  </button>
                </div>
              ))}
              {photoDataUrls.length < MAX_PHOTOS && (
                <label className="flex h-28 w-24 cursor-pointer items-center justify-center rounded border border-dashed text-center text-xs text-primary hover:bg-muted/40">
                  {isProcessingPhoto ? "Adding..." : "Add Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isProcessingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleAddPhoto(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {pendingPhotoDataUrl && (
              <div className="mt-3 space-y-2 rounded-md border border-dashed p-2">
                <p className="text-xs text-black">Selected photo preview</p>
                <div className="h-24 w-24 overflow-hidden rounded border">
                  <img src={pendingPhotoDataUrl} alt="Pending photo" className="h-full w-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      setPendingPhotoDataUrl(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                    onClick={() => {
                      setPhotoDataUrls((prev) => [...prev, pendingPhotoDataUrl]);
                      setPendingPhotoDataUrl(null);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            <p className="pt-2 text-xs text-black">Upload between 1 and 5 photos.</p>
          </div>

          <div className="section-header">Maid Video</div>
          <div className="space-y-2 pt-2">
            {videoDataUrl ? (
              <video controls className="max-h-[220px] w-full rounded-md border bg-black" src={videoDataUrl}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-black">No video selected yet.</div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded border px-3 py-2 text-sm">
                {isProcessingVideo ? "Processing Video..." : videoDataUrl ? "Replace Video" : "Upload Video"}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={isProcessingVideo}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void handleVideoUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {videoDataUrl && (
                <button
                  type="button"
                  className="rounded border border-destructive px-3 py-2 text-sm text-destructive"
                  onClick={() => setVideoDataUrl("")}
                >
                  Delete Video
                </button>
              )}
            </div>
          </div>

          <div className="section-header">A1. Personal Information</div>
          <div className="space-y-3 pt-2">
            {[
              ["Maid Name", "Ref Code"],
              ["Type", "Nationality"],
              ["Date of Birth", "Place of Birth"],
              ["Height", "Weight"],
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {row.map((label) => (
                  <div key={label} className="flex flex-col gap-1">
                    <Label className="text-xs font-medium text-black">
                      {label === "Height"
                        ? "Height (cm)"
                        : label === "Weight"
                        ? "Weight (kg)"
                        : label}
                    </Label>

                    {label === "Maid Name" && (
                      <Input
                        value={profile.fullName}
                        onChange={(e) =>
                          handleProfileChange("fullName", e.target.value)
                        }
                      />
                    )}

                    {label === "Ref Code" && (
                      <Input
                        value={profile.referenceCode}
                        onChange={(e) =>
                          handleProfileChange("referenceCode", e.target.value)
                        }
                      />
                    )}

                    {label === "Type" && (
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={profile.type}
                        onChange={(e) =>
                          handleProfileChange("type", e.target.value)
                        }
                      >
                        <option>New maid</option>
                        <option>Transfer maid</option>
                        <option>APS maid</option>
                        <option>Ex-Singapore maid</option>
                        <option>Ex-Hong Kong maid</option>
                        <option>Ex-Taiwan maid</option>
                        <option>Ex-Malaysia maid</option>
                        <option>Ex-Middle East maid</option>
                        <option>Applying to work in HongKong</option>
                        <option>Applying to work in Taiwan</option>
                        <option>Applying to work in Canada</option>
                      </select>
                    )}

                    {label === "Nationality" && (
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={profile.nationality}
                        onChange={(e) =>
                          handleProfileChange("nationality", e.target.value)
                        }
                      >
                        <option>Filipino maid</option>
                        <option>Indonesian maid</option>
                        <option>Indian maid</option>
                        <option>Myanmar maid</option>
                        <option>Sri Lankan maid</option>
                        <option>Nepali maid</option>
                        <option>Cambodian maid</option>
                        <option>Bandladeshi maid</option>
                        <option>Others</option>
                      </select>
                    )}

                    {label === "Date of Birth" && (
                      <Input
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) =>
                          handleProfileChange("dateOfBirth", e.target.value)
                        }
                      />
                    )}

                    {label === "Place of Birth" && (
                      <Input
                        value={profile.placeOfBirth}
                        onChange={(e) =>
                          handleProfileChange("placeOfBirth", e.target.value)
                        }
                      />
                    )}

                    {label === "Height" && (
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={profile.height}
                        onChange={(e) =>
                          handleProfileChange("height", e.target.value)
                        }
                      >
                        {Array.from({ length: 61 }, (_, i) => {
                          const cm = 140 + i;
                          const inches = cm / 2.54;
                          const feet = Math.floor(inches / 12);
                          const inch = Math.round(inches % 12);
                          return (
                            <option key={cm} value={cm}>
                              {cm} cm ({feet}'{inch}")
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {label === "Weight" && (
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={profile.weight}
                        onChange={(e) =>
                          handleProfileChange("weight", e.target.value)
                        }
                      >
                        {Array.from({ length: 71 }, (_, i) => {
                          const kg = 30 + i;
                          const lbs = Math.round(kg * 2.20462);
                          return (
                            <option key={kg} value={kg}>
                              {kg} Kg ({lbs} lbs)
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-black">Number of Children</Label>
                <Input type="number" value={profile.numberOfChildren} onChange={(e) => handleProfileChange("numberOfChildren", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-black">Number of Siblings</Label>
                <Input type="number" value={profile.numberOfSiblings} onChange={(e) => handleProfileChange("numberOfSiblings", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-black">Marital Status</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.maritalStatus} onChange={(e) => handleProfileChange("maritalStatus", e.target.value)}>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-black">Religion</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.religion} onChange={(e) => handleProfileChange("religion", e.target.value)}>
                  <option>Catholic</option>
                  <option>Christian</option>
                  <option>Muslim</option>
                  <option>Hindu</option>
                  <option>Buddhist</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Address in Home Country</Label>
              <Input value={profile.homeAddress} onChange={(e) => handleProfileChange("homeAddress", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-black">Airport To Be Repatriated</Label>
                <Input value={profile.airportRepatriation} onChange={(e) => handleProfileChange("airportRepatriation", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-black">Education</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={profile.educationLevel} onChange={(e) => handleProfileChange("educationLevel", e.target.value)}>
                  <option>College/Degree (&gt;=13 yrs)</option>
                  <option>High School (10-12 yrs)</option>
                  <option>Primary (&lt;=6 yrs)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Contact Number in Home Country</Label>
              <Input value={profile.homeCountryContactNumber} onChange={(e) => handleProfileChange("homeCountryContactNumber", e.target.value)} />
            </div>
          </div>

          <div className="section-header">Language Skills</div>
          <div className="space-y-3 pt-2">
            {languageOptions.map((lang) => (
              <div key={lang} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label className="w-56 text-sm">{lang}:</Label>
                <div className="flex flex-wrap gap-4">
                  {["Zero", "Poor", "Little", "Fair", "Good"].map((level) => (
                    <label key={level} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name={lang}
                        checked={languageSkills[lang] === level}
                        onChange={() => setLanguageSkills((prev) => ({ ...prev, [lang]: level }))}
                        className="accent-primary"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="section-header">Other Information</div>
          <div className="space-y-2 pt-2">
            {yesNoQuestions.map((question) => (
              <div key={question} className="flex items-center gap-4">
                <span className="flex-1 text-sm">{question}</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={question} checked={otherInformation[question] === true} onChange={() => setOtherInformation((prev) => ({ ...prev, [question]: true }))} /> Yes</label>
                  <label className="flex items-center gap-1 text-sm"><input type="radio" name={question} checked={otherInformation[question] === false} onChange={() => setOtherInformation((prev) => ({ ...prev, [question]: false }))} /> No</label>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium  whitespace-nowrap">Number of off-days per month</Label>
              <Input className="w-20 text-end" value={profile.offDaysPerMonth} onChange={(e) => handleProfileChange("offDaysPerMonth", e.target.value)} />
              <span className="text-sm">rest day(s) per month</span>
            </div>
          </div>
        
          <div className="section-header">A2. Medical History / Dietary Restrictions</div>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-black">Allergies (if any)</Label>
                <Input value={medicalInfo.allergies} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, allergies: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-black">Physical disabilities</Label>
                <Input value={medicalInfo.physicalDisabilities} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, physicalDisabilities: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-black">Dietary restrictions</Label>
                <Input value={medicalInfo.dietaryRestrictions} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, dietaryRestrictions: e.target.value }))} />
              </div>
            <div className="flex flex-col gap-2">
                <Label className="text-xs text-black">Food handling preferences</Label>
              <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={medicalInfo.noPork || false}
                          onChange={(e) =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              noPork: e.target.checked,
                            }))
                          }
                        />
                        No Pork
                      </label>

                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={medicalInfo.noBeef || false}
                          onChange={(e) =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              noBeef: e.target.checked,
                            }))
                          }
                        />
                        No Beef
                      </label>
                    
                      <div className="flex items-center gap-1">
                        <span className="text-sm">Others</span>
                        <Input
                          className="h-7 w-[150px]"
                          value={medicalInfo.foodHandlingPreferences || ""}
                          onChange={(e) =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              foodHandlingPreferences: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Past and existing illnesses (including chronic ailments and illnesses requiring medication):</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {medicalQuestions.map((illness) => (
                  <div key={illness} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{illness}</span>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={illness}
                          checked={medicalInfo.pastIllnesses[illness] === true}
                          onChange={() =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              pastIllnesses: { ...prev.pastIllnesses, [illness]: true },
                            }))
                          }
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={illness}
                          checked={medicalInfo.pastIllnesses[illness] === false}
                          onChange={() =>
                            setMedicalInfo((prev) => ({
                              ...prev,
                              pastIllnesses: { ...prev.pastIllnesses, [illness]: false },
                            }))
                          }
                        />
                        No
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-black">Others (please specify)</Label>
              <Input value={medicalInfo.otherIllnesses} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, otherIllnesses: e.target.value }))} />
            </div>
          </div>

          <div className="section-header">A3. Others</div>
          <div className="pt-2">
            <Label className="text-xs text-black">Any other remarks</Label>
            <Input value={medicalInfo.otherRemarks} onChange={(e) => setMedicalInfo((prev) => ({ ...prev, otherRemarks: e.target.value }))} />
          </div>

          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? "Saving..." : nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="text-center font-bold">Maid Skills</h3>
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border px-3 py-2 text-left">Areas of Work</th>
                <th className="border px-3 py-2">Willingness</th>
                <th className="border px-3 py-2">Experience</th>
                <th className="border px-3 py-2">Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {skillAreas.map((skill) => (
                  <tr
                    key={skill}
                    className="hover:bg-muted/50 transition-colors">
                    <td className="border px-4 py-3 font-medium text-sm">
                      {skill}
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={workAreas[skill]?.willing ?? false}
                        onChange={(e) =>
                          updateWorkArea(skill, "willing", e.target.checked)
                        }
                      />
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={workAreas[skill]?.experience ?? false}
                        onChange={(e) =>
                          updateWorkArea(skill, "experience", e.target.checked)
                        }
                      />
                    </td>
                    <td className="border px-4 py-3 text-center">
                      <select
                        className="rounded-md border px-2 py-1 text-xs bg-background shadow-sm hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        value={workAreas[skill]?.evaluation ?? "-"}
                        onChange={(e) =>
                          updateWorkArea(skill, "evaluation", e.target.value)
                        }>
                        <option value="-">Select</option>
                        <option value="*">⭐</option>
                        <option value="**">⭐⭐</option>
                        <option value="***">⭐⭐⭐</option>
                        <option value="****">⭐⭐⭐⭐</option>
                        <option value="*****">⭐⭐⭐⭐⭐</option>
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="text-center font-bold">Employment History</h3>
          <table className="w-full border border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border px-3 py-2">From</th>
                <th className="border px-3 py-2">To</th>
                <th className="border px-3 py-2">Country</th>
                <th className="border px-3 py-2">Employer</th>
                <th className="border px-3 py-2">Maid Duties</th>
                <th className="border px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {employmentHistory.map((row, index) => (
                <tr key={`${index}-${row.from}-${row.to}`} className="hover:bg-muted/50 transition-colors align-top">
                  {(["from", "to", "country", "employer", "duties", "remarks"] as const).map((field) => {
                    const isDateField = field === "from" || field === "to";
                    const isLongText = field === "duties" || field === "remarks";

                    return (
                      <td key={field} className="border px-2 py-1 align-top">
                        {isDateField ? (
                          <input
                            type="date"
                            className="h-8 w-full text-xs px-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        ) : isLongText ? (
                          <textarea
                            className="w-full text-xs px-2 py-1 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={2}
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        ) : (
                          <Input
                            className="h-8 w-full text-xs px-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            value={row[field]}
                            onChange={(e) => updateEmploymentRow(index, field, e.target.value)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-4 pt-4">
            <Button className="bg-green-600 px-4 text-white hover:bg-green-700" onClick={addEmploymentRow}>Add Row</Button>
            <Button className="bg-red-500 px-4 text-white hover:bg-red-600" onClick={removeLastEmploymentRow}>Remove Last Row</Button>
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Availability / Remark</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">When will this maid be available?</Label>
              <Input value={availabilityInfo.availability} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, availability: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Contract Ends</Label>
              <Input type="date" value={availabilityInfo.contractEnds} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, contractEnds: e.target.value, })) } />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Present Salary (S$)</Label>
              <Input value={availabilityInfo.presentSalary} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, presentSalary: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Expected Salary</Label>
              <Input value={availabilityInfo.expectedSalary} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, expectedSalary: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Offday Compensation (S$/day)</Label>
              <Input value={availabilityInfo.offdayCompensation} onChange={(e) => setAvailabilityInfo((prev) => ({ ...prev, offdayCompensation: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Passport No.</Label>
              <Input value={profile.passportNo} onChange={(e) => handleProfileChange("passportNo", e.target.value)} />
            </div>
          </div>
          <textarea className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter availability / remark here..." value={availabilityRemark} onChange={(e) => setAvailabilityRemark(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Introduction</h3>
          <textarea className="min-h-[260px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter employer-login introduction here..." value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 5 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Public Introduction</h3>
          <textarea className="min-h-[260px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter public introduction here..." value={publicIntroduction} onChange={(e) => setPublicIntroduction(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>{nextLabel}</Button>
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div className="content-card animate-fade-in-up space-y-4">
          <h3 className="mb-4 text-center font-bold">Private Info</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Agency Name</Label>
              <Input value={agencyContact.companyName} onChange={(e) => setAgencyContact((prev) => ({ ...prev, companyName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">License No.</Label>
              <Input value={agencyContact.licenseNo} onChange={(e) => setAgencyContact((prev) => ({ ...prev, licenseNo: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Contact Person</Label>
              <Input value={agencyContact.contactPerson} onChange={(e) => setAgencyContact((prev) => ({ ...prev, contactPerson: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Phone</Label>
              <Input value={agencyContact.phone} onChange={(e) => setAgencyContact((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Ages of Children</Label>
              <Input value={privateDetails.agesOfChildren} onChange={(e) => setPrivateDetails((prev) => ({ ...prev, agesOfChildren: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-black">Maid Loan (S$)</Label>
              <Input value={privateDetails.maidLoan} onChange={(e) => setPrivateDetails((prev) => ({ ...prev, maidLoan: e.target.value }))} />
            </div>
          </div>
          <textarea className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Enter private information here..." value={privateInfo} onChange={(e) => setPrivateInfo(e.target.value)} />
          <div className="flex justify-center pt-4">
            <Button className="bg-accent px-8 text-accent-foreground hover:bg-accent/90" disabled={isSubmitting} onClick={handleContinue}>
              {isSubmitting ? "Saving..." : nextLabel}
            </Button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default AddMaid;
