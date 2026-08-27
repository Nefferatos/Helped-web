import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getAgencyAdminAuthHeaders } from "@/lib/agencyAdminAuth";
import { readSafeJson } from "@/lib/safeJson";
import { useAiInquiry, type InquiryConversationItem } from "@/hooks/useAiAutomation";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Reply,
  Send,
  Sparkles,
  Star,
  Users,
  X,
  Eye,
  Zap,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Globe,
  Briefcase,
  Languages,
  Award,
  FileCheck2,
  Building2,
  Home,
  Baby,
  HeartPulse,
  Utensils,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  BadgeCheck,
  MapPin,
  Hash,
  TrendingUp,
  Wand2,
  Copy,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type EnquiryStatus = "new" | "in_progress" | "replied" | "resolved";

interface EnquiryRecord {
  id: number;
  username: string;
  date: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  status?: EnquiryStatus;
  note?: string;
  assignedTo?: string;
  clientId?: number;
  clientName?: string;
}

type RequestStatus = "pending" | "interested" | "direct_hire" | "rejected";

interface RequestClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  createdAt?: string;
  profileImageUrl?: string;
}

interface RequestMaid {
  referenceCode: string;
  fullName: string;
  nationality: string;
  status?: string;
  type?: string;
  photoDataUrl?: string;
}

interface RequestRecord {
  id: string;
  clientId: number | null;
  type: string;
  status: RequestStatus;
  summary: string;
  budget: string | null;
  details: Record<string, unknown>;
  maidReferences: string[];
  createdAt: string;
  updatedAt: string;
  client: RequestClient | null;
  maids: RequestMaid[];
}

interface AtsProfile {
  fullName: string;
  email: string;
  contactNumber: string;
  whatsappNumber?: string;
  nationality: string;
  age: number | null;
  yearsOfExperience: number;
  expectedSalary: number | null;
  languageSkills: string[];
  childcareExperience: number;
  newbornCareExperience: number;
  elderlyCareExperience: number;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  previousCountriesWorkedIn?: string[];
  disabledCareExperience?: number;
  housekeepingExperience?: number;
  cookingSkills?: string[];
  petCareExperience?: number;
  certifications?: string[];
  trainingRecords?: string[];
  availableDate?: string;
  employmentPreference?: string;
  medicalStatus?: string;
  passportStatus?: string;
  certificationStatus?: string;
  introductionVideoUrl?: string;
  workHistory?: Array<Record<string, unknown>>;
  fdwFormData?: Record<string, unknown>;
  strengthsTags?: string[];
  weaknessesTags?: string[];
  clientMatchScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AtsScore {
  score: number;
  category: string;
  explanation: string;
  strengths?: string[];
  weaknesses?: string[];
  factors?: {
    experience: number;
    skillMatch: number;
    certifications: number;
    references: number;
    languageSkills: number;
    interviewRating: number;
  };
  updatedAt?: string;
}

interface AtsApplication {
  id: string;
  applicationCode: string;
  maidReferenceCode?: string;
  status: string;
  appliedAt: string;
  profile: AtsProfile;
  score?: AtsScore | null;
  source: string;
  aiParseSummary?: string;
  updatedAt?: string;
}

interface EmployerRow {
  ref: string;
  date: string;
  employer: string;
  maid: string;
  maidPhoto: string;
  maidNationality: string;
  documents?: { name: string; status: string }[];
  hasContract: boolean;
  employerNationality?: string;
  spouse?: string;
  spouseNationality?: string;
  agency?: Record<string, unknown>;
  maidDetails?: Record<string, unknown>;
  employerDetails?: Record<string, unknown>;
  spouseDetails?: Record<string, unknown>;
  familyMembers?: Array<Record<string, unknown>>;
  notificationDate?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
}

interface MarketingMessage {
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactSource: string;
  message: string;
  whatsappLink: string;
  charCount: number;
  whatsappReady: boolean;
}

interface Campaign {
  id: string;
  goal: string;
  tone: string;
  audienceType: string;
  maidReferences: string[];
  messageTemplate: string;
  subject: string;
  messages: MarketingMessage[];
  contactCount: number;
  whatsappReadyCount: number;
  emailOnlyCount: number;
  generatedAt: string;
  aiUsed: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ENQUIRY_STATUS_META: Record<EnquiryStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  new: { label: "New", icon: Circle, color: "text-sky-700", bg: "bg-sky-50" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
  replied: { label: "Replied", icon: Reply, color: "text-violet-700", bg: "bg-violet-50" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
};

const REQUEST_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" },
  interested: { label: "Interested", color: "text-sky-700", bg: "bg-sky-50" },
  direct_hire: { label: "Direct Hire", color: "text-emerald-700", bg: "bg-emerald-50" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50" },
};

const SCORE_RANGES = [
  { min: 90, label: "Excellent", color: "text-emerald-800", bg: "bg-emerald-100" },
  { min: 75, label: "Good", color: "text-sky-800", bg: "bg-sky-100" },
  { min: 60, label: "Average", color: "text-amber-800", bg: "bg-amber-100" },
  { min: 40, label: "Below Avg", color: "text-orange-800", bg: "bg-orange-100" },
  { min: 0, label: "Low", color: "text-rose-800", bg: "bg-rose-100" },
];

const getScoreMeta = (score?: number | null) => {
  const s = score ?? 0;
  for (const r of SCORE_RANGES) {
    if (s >= r.min) return r;
  }
  return SCORE_RANGES[SCORE_RANGES.length - 1];
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return formatDate(iso);
};

const toText = (v: unknown) => String(v ?? "").trim();

// ─── Detail Modal Components ────────────────────────────────────────────────

function DetailField({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: React.ElementType }) {
  if (value === undefined || value === null || value === "" || value === "N/A") return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {Icon && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <h4 className="mb-2 text-[13px] font-bold text-gray-900">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ─── Enquiry Detail Modal ───────────────────────────────────────────────────

function EnquiryDetailModal({ enquiry, onClose }: { enquiry: EnquiryRecord | null; onClose: () => void }) {
  if (!enquiry) return null;
  const meta = ENQUIRY_STATUS_META[enquiry.status ?? "new"];
  const Icon = meta.icon;
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MessageSquare className="h-5 w-5 text-sky-600" />
            Enquiry Details
          </DialogTitle>
          <DialogDescription>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <DetailSection title="Contact Information">
              <DetailField label="Name" value={enquiry.username || "Anonymous"} icon={User} />
              <DetailField label="Email" value={enquiry.email} icon={Mail} />
              <DetailField label="Phone" value={enquiry.phone} icon={Phone} />
              {enquiry.clientName && <DetailField label="Client" value={enquiry.clientName} icon={BadgeCheck} />}
            </DetailSection>

            <DetailSection title="Enquiry Message">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{enquiry.message}</p>
              </div>
            </DetailSection>

            <DetailSection title="Details">
              <DetailField label="Submitted" value={formatDateTime(enquiry.createdAt)} icon={Calendar} />
              <DetailField label="Date" value={enquiry.date} icon={Calendar} />
              {enquiry.assignedTo && <DetailField label="Assigned To" value={enquiry.assignedTo} icon={User} />}
              {enquiry.note && <DetailField label="Note" value={enquiry.note} icon={FileText} />}
            </DetailSection>

            <div className="flex flex-wrap gap-2 pt-1">
              {enquiry.phone && (
                <a
                  href={`https://wa.me/${enquiry.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
              {enquiry.email && (
                <a
                  href={`mailto:${enquiry.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Detail Modal ───────────────────────────────────────────────────

function RequestDetailModal({ request, onClose }: { request: RequestRecord | null; onClose: () => void }) {
  if (!request) return null;
  const meta = REQUEST_STATUS_META[request.status] ?? REQUEST_STATUS_META.pending;
  const details = request.details ?? {};
  const detailEntries = Object.entries(details).filter(([key, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "object") return Object.keys(value as object).length > 0;
    return true;
  });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Inbox className="h-5 w-5 text-amber-600" />
            Request Details
          </DialogTitle>
          <DialogDescription>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <DetailSection title="Client Information">
              <DetailField label="Name" value={request.client?.name || "Unknown client"} icon={User} />
              <DetailField label="Email" value={request.client?.email} icon={Mail} />
              <DetailField label="Phone" value={request.client?.phone} icon={Phone} />
              <DetailField label="Company" value={request.client?.company} icon={Building2} />
            </DetailSection>

            <DetailSection title="Request Summary">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm leading-relaxed text-gray-800">{request.summary}</p>
              </div>
            </DetailSection>

            <DetailSection title="Request Details">
              <DetailField label="Type" value={request.type === "direct" ? "Direct Hire" : "General"} icon={Briefcase} />
              {request.budget && <DetailField label="Budget" value={`$${request.budget}`} icon={DollarSign} />}
              <DetailField label="Created" value={formatDateTime(request.createdAt)} icon={Calendar} />
              <DetailField label="Updated" value={formatDateTime(request.updatedAt)} icon={Calendar} />
            </DetailSection>

            {request.maids.length > 0 && (
              <DetailSection title={`Maids (${request.maids.length})`}>
                <div className="space-y-2">
                  {request.maids.map((m) => (
                    <div key={m.referenceCode} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                      {m.photoDataUrl ? (
                        <img src={m.photoDataUrl} alt={m.fullName} className="h-10 w-8 shrink-0 rounded object-cover object-top" />
                      ) : (
                        <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-700">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{m.fullName}</p>
                        <p className="text-[11px] text-gray-500">{m.referenceCode} · {m.nationality}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {detailEntries.length > 0 && (
              <DetailSection title="Additional Information">
                {detailEntries.map(([key, value]) => (
                  <DetailField
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                    value={typeof value === "object" ? JSON.stringify(value) : String(value)}
                  />
                ))}
              </DetailSection>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Applicant Detail Modal ─────────────────────────────────────────────────

function ApplicantDetailModal({ applicant, onClose }: { applicant: AtsApplication | null; onClose: () => void }) {
  if (!applicant) return null;
  const p = applicant.profile;
  const scoreMeta = getScoreMeta(applicant.score?.score);
  const scoreVal = applicant.score?.score ?? 0;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Users className="h-5 w-5 text-indigo-600" />
            Applicant Details
          </DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${scoreMeta.bg} ${scoreMeta.color}`}>
                {scoreVal} · {scoreMeta.label}
              </span>
              <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-600">
                {applicant.status}
              </Badge>
              <span className="text-[11px] text-gray-500">{applicant.applicationCode}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <DetailSection title="Personal Information">
              <DetailField label="Full Name" value={p.fullName} icon={User} />
              <DetailField label="Nationality" value={p.nationality} icon={Globe} />
              <DetailField label="Age" value={p.age != null ? `${p.age} years` : undefined} icon={Calendar} />
              <DetailField label="Date of Birth" value={p.dateOfBirth ? formatDate(p.dateOfBirth) : undefined} icon={Calendar} />
              <DetailField label="Gender" value={p.gender} icon={User} />
              <DetailField label="Marital Status" value={p.maritalStatus} icon={Home} />
              <DetailField label="Address" value={p.address} icon={MapPin} />
            </DetailSection>

            <DetailSection title="Contact Information">
              <DetailField label="Email" value={p.email} icon={Mail} />
              <DetailField label="Phone" value={p.contactNumber} icon={Phone} />
              <DetailField label="WhatsApp" value={p.whatsappNumber} icon={MessageSquare} />
            </DetailSection>

            <DetailSection title="Work Experience">
              <DetailField label="Years of Experience" value={p.yearsOfExperience != null ? `${p.yearsOfExperience} years` : undefined} icon={Briefcase} />
              <DetailField label="Previous Countries" value={p.previousCountriesWorkedIn?.join(", ")} icon={Globe} />
              <DetailField label="Childcare" value={p.childcareExperience != null ? `${p.childcareExperience} years` : undefined} icon={Baby} />
              <DetailField label="Newborn Care" value={p.newbornCareExperience != null ? `${p.newbornCareExperience} years` : undefined} icon={Baby} />
              <DetailField label="Elderly Care" value={p.elderlyCareExperience != null ? `${p.elderlyCareExperience} years` : undefined} icon={HeartPulse} />
              <DetailField label="Disabled Care" value={p.disabledCareExperience != null ? `${p.disabledCareExperience} years` : undefined} icon={HeartPulse} />
              <DetailField label="Housekeeping" value={p.housekeepingExperience != null ? `${p.housekeepingExperience} years` : undefined} icon={Home} />
              <DetailField label="Pet Care" value={p.petCareExperience != null ? `${p.petCareExperience} years` : undefined} icon={PawPrint} />
            </DetailSection>

            <DetailSection title="Skills & Qualifications">
              {p.languageSkills?.length > 0 && (
                <DetailField label="Languages" value={p.languageSkills.join(", ")} icon={Languages} />
              )}
              {p.cookingSkills?.length > 0 && (
                <DetailField label="Cooking Skills" value={p.cookingSkills.join(", ")} icon={Utensils} />
              )}
              {p.certifications?.length > 0 && (
                <DetailField label="Certifications" value={p.certifications.join(", ")} icon={Award} />
              )}
              {p.trainingRecords?.length > 0 && (
                <DetailField label="Training" value={p.trainingRecords.join(", ")} icon={FileCheck2} />
              )}
              {p.strengthsTags?.length > 0 && (
                <DetailField label="Strengths" value={p.strengthsTags.join(", ")} icon={ShieldCheck} />
              )}
              {p.weaknessesTags?.length > 0 && (
                <DetailField label="Areas to Improve" value={p.weaknessesTags.join(", ")} icon={AlertTriangle} />
              )}
            </DetailSection>

            <DetailSection title="Employment Preferences">
              <DetailField label="Expected Salary" value={p.expectedSalary != null ? `$${p.expectedSalary}/mo` : undefined} icon={DollarSign} />
              <DetailField label="Available Date" value={p.availableDate ? formatDate(p.availableDate) : undefined} icon={Calendar} />
              <DetailField label="Preference" value={p.employmentPreference} icon={Briefcase} />
            </DetailSection>

            <DetailSection title="Status">
              <DetailField label="Medical" value={p.medicalStatus} icon={Stethoscope} />
              <DetailField label="Passport" value={p.passportStatus} icon={FileCheck2} />
              <DetailField label="Certification" value={p.certificationStatus} icon={Award} />
              <DetailField label="Applied" value={formatDateTime(applicant.appliedAt)} icon={Calendar} />
              {applicant.maidReferenceCode && <DetailField label="Maid Ref" value={applicant.maidReferenceCode} icon={Hash} />}
            </DetailSection>

            {applicant.score?.explanation && (
              <DetailSection title="AI Score Explanation">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm leading-relaxed text-gray-800">{applicant.score.explanation}</p>
                </div>
              </DetailSection>
            )}

            {applicant.aiParseSummary && (
              <DetailSection title="AI Parse Summary">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm leading-relaxed text-gray-800">{applicant.aiParseSummary}</p>
                </div>
              </DetailSection>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {p.whatsappNumber && (
                <a
                  href={`https://wa.me/${p.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
              {p.email && (
                <a
                  href={`mailto:${p.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contract Detail Modal ──────────────────────────────────────────────────

function ContractDetailModal({ contract, onClose }: { contract: EmployerRow | null; onClose: () => void }) {
  if (!contract) return null;
  const agency = contract.agency ?? {};
  const maidDetails = contract.maidDetails ?? {};
  const employerDetails = contract.employerDetails ?? {};
  const spouseDetails = contract.spouseDetails ?? {};

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText className="h-5 w-5 text-emerald-600" />
            Contract Details
          </DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500">Ref: {contract.ref}</span>
              {contract.hasContract ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Contract
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  <X className="h-3 w-3" />
                  No Contract
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <DetailSection title="Employer">
              <DetailField label="Name" value={contract.employer || contract.ref} icon={User} />
              <DetailField label="Nationality" value={contract.employerNationality || toText(employerDetails.nationality)} icon={Globe} />
              {toText(employerDetails.email) && <DetailField label="Email" value={toText(employerDetails.email)} icon={Mail} />}
              {toText(employerDetails.phone) && <DetailField label="Phone" value={toText(employerDetails.phone)} icon={Phone} />}
              {toText(employerDetails.address) && <DetailField label="Address" value={toText(employerDetails.address)} icon={MapPin} />}
              {toText(employerDetails.nric) && <DetailField label="NRIC" value={toText(employerDetails.nric)} icon={Hash} />}
            </DetailSection>

            {contract.spouse && (
              <DetailSection title="Spouse">
                <DetailField label="Name" value={contract.spouse} icon={User} />
                <DetailField label="Nationality" value={contract.spouseNationality || toText(spouseDetails.nationality)} icon={Globe} />
                {toText(spouseDetails.email) && <DetailField label="Email" value={toText(spouseDetails.email)} icon={Mail} />}
                {toText(spouseDetails.phone) && <DetailField label="Phone" value={toText(spouseDetails.phone)} icon={Phone} />}
              </DetailSection>
            )}

            <DetailSection title="Maid">
              <div className="flex items-center gap-3">
                {contract.maidPhoto ? (
                  <img src={contract.maidPhoto} alt={contract.maid} className="h-14 w-10 shrink-0 rounded object-cover object-top" />
                ) : (
                  <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-700">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">{contract.maid || "N/A"}</p>
                  <p className="text-[11px] text-gray-500">{contract.maidNationality}</p>
                </div>
              </div>
              {toText(maidDetails.referenceCode) && <DetailField label="Reference" value={toText(maidDetails.referenceCode)} icon={Hash} />}
              {toText(maidDetails.passportNo) && <DetailField label="Passport" value={toText(maidDetails.passportNo)} icon={FileCheck2} />}
            </DetailSection>

            <DetailSection title="Agency / Contract">
              <DetailField label="Contract Date" value={contract.date ? formatDate(contract.date) : undefined} icon={Calendar} />
              {toText(agency.caseReferenceNumber) && <DetailField label="Case Ref" value={toText(agency.caseReferenceNumber)} icon={Hash} />}
              {toText(agency.serviceFee) && <DetailField label="Service Fee" value={toText(agency.serviceFee)} icon={DollarSign} />}
              {toText(agency.placementFee) && <DetailField label="Placement Fee" value={toText(agency.placementFee)} icon={DollarSign} />}
              {toText(agency.agencyWitness) && <DetailField label="Agency Witness" value={toText(agency.agencyWitness)} icon={User} />}
              {toText(agency.agencyName) && <DetailField label="Agency" value={toText(agency.agencyName)} icon={Building2} />}
            </DetailSection>

            {contract.familyMembers && contract.familyMembers.length > 0 && (
              <DetailSection title={`Family Members (${contract.familyMembers.length})`}>
                <div className="space-y-1.5">
                  {contract.familyMembers.map((member, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white p-2.5">
                      <p className="text-sm font-bold text-gray-900">{toText(member.name)}</p>
                      <p className="text-[11px] text-gray-500">
                        {toText(member.relationship)}
                        {toText(member.nationality) && ` · ${toText(member.nationality)}`}
                      </p>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {contract.documents && contract.documents.length > 0 && (
              <DetailSection title={`Documents (${contract.documents.length})`}>
                <div className="space-y-1.5">
                  {contract.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2.5">
                      <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.status === "complete"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {doc.status === "complete" ? "Complete" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            <DetailSection title="Timestamps">
              <DetailField label="Created" value={contract.createdAt ? formatDateTime(contract.createdAt) : undefined} icon={Calendar} />
              <DetailField label="Updated" value={contract.updatedAt ? formatDateTime(contract.updatedAt) : undefined} icon={Calendar} />
            </DetailSection>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section: Enquiries ─────────────────────────────────────────────────────

function EnquiriesList({ enquiries, onView }: { enquiries: EnquiryRecord[]; onView: (enq: EnquiryRecord) => void }) {
  const sorted = useMemo(
    () => [...enquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [enquiries],
  );
  const urgent = sorted.filter((e) => e.status === "new" || e.status === "in_progress");
  const recent = sorted.slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Inbox className="h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">No enquiries yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {urgent.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 px-5 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span className="text-sm font-semibold text-red-800">
            {urgent.length} enquiry{urgent.length > 1 ? "ies" : ""} need{urgent.length === 1 ? "s" : ""} attention
          </span>
        </div>
      )}
      {recent.map((enq) => {
        const meta = ENQUIRY_STATUS_META[enq.status ?? "new"];
        const Icon = meta.icon;
        return (
          <button
            key={enq.id}
            type="button"
            onClick={() => onView(enq)}
            className="w-full text-left px-5 py-3.5 grid gap-2 sm:grid-cols-[1fr_auto] items-center transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 truncate">{enq.username || enq.email || "Anonymous"}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-600 line-clamp-1">{enq.message}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                {enq.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{enq.email}</span>}
                {enq.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{enq.phone}</span>}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(enq.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {enq.phone && (
                <a
                  href={`https://wa.me/${enq.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <MessageSquare className="h-3 w-3" />
                  WA
                </a>
              )}
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
          </button>
        );
      })}
      {sorted.length > 20 && (
        <div className="px-5 py-2.5 text-center">
          <span className="text-[12px] font-medium text-gray-500">+ {sorted.length - 20} more enquiries</span>
        </div>
      )}
    </div>
  );
}

// ─── Section: Requests ──────────────────────────────────────────────────────

function RequestsList({ requests, onView }: { requests: RequestRecord[]; onView: (req: RequestRecord) => void }) {
  const sorted = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  );
  const pending = sorted.filter((r) => r.status === "pending");
  const recent = sorted.slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Inbox className="h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">No requests yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {pending.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 px-5 py-2.5">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">
            {pending.length} pending request{pending.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
      {recent.map((req) => {
        const meta = REQUEST_STATUS_META[req.status] ?? REQUEST_STATUS_META.pending;
        const clientName = req.client?.name || "Unknown client";
        return (
          <button
            key={req.id}
            type="button"
            onClick={() => onView(req)}
            className="w-full text-left px-5 py-3.5 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate">{clientName}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 line-clamp-1">{req.summary}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                  <span>{req.type === "direct" ? "Direct Hire" : "General"}</span>
                  {req.budget && <span>Budget: ${req.budget}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(req.createdAt)}</span>
                </div>
                {req.maids.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {req.maids.map((m) => (
                      <span key={m.referenceCode} className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {m.fullName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Eye className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
            </div>
          </button>
        );
      })}
      {sorted.length > 20 && (
        <div className="px-5 py-2.5 text-center">
          <span className="text-[12px] font-medium text-gray-500">+ {sorted.length - 20} more requests</span>
        </div>
      )}
    </div>
  );
}

// ─── Section: Applicants ────────────────────────────────────────────────────

function ApplicantsList({ applicants, onView }: { applicants: AtsApplication[]; onView: (app: AtsApplication) => void }) {
  const sorted = useMemo(
    () => [...applicants].sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0)),
    [applicants],
  );
  const top = sorted.slice(0, 20);

  if (top.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Users className="h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">No applicants yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2.5">
        <Users className="h-4 w-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-semibold text-indigo-800">
          {sorted.length} applicant{sorted.length > 1 ? "s" : ""} · Sorted by score (high to low)
        </span>
      </div>
      {top.map((app) => {
        const scoreMeta = getScoreMeta(app.score?.score);
        const scoreVal = app.score?.score ?? 0;
        return (
          <div key={app.id} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {app.profile.fullName || app.applicationCode || "Unnamed"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${scoreMeta.bg} ${scoreMeta.color}`}>
                    {scoreVal} · {scoreMeta.label}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-600">
                    {app.status}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
                  <span>{app.profile.nationality}</span>
                  <span>{app.profile.yearsOfExperience}y exp</span>
                  {app.profile.expectedSalary && <span>${app.profile.expectedSalary}/mo</span>}
                  {app.profile.languageSkills?.length > 0 && (
                    <span>{app.profile.languageSkills.slice(0, 3).join(", ")}{app.profile.languageSkills.length > 3 ? " +more" : ""}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(app.appliedAt)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(app)}
                  className="gap-1.5 text-[12px]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                {app.profile.whatsappNumber && (
                  <a
                    href={`https://wa.me/${app.profile.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length > 20 && (
        <div className="px-5 py-2.5 text-center">
          <span className="text-[12px] font-medium text-gray-500">+ {sorted.length - 20} more applicants</span>
        </div>
      )}
    </div>
  );
}

// ─── Section: Contracts ────────────────────────────────────────────────────

function ContractsList({ contracts, onView }: { contracts: EmployerRow[]; onView: (c: EmployerRow) => void }) {
  const sorted = useMemo(
    () => [...contracts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [contracts],
  );
  const noContract = sorted.filter((c) => !c.hasContract);
  const missingDocs = sorted.filter((c) => c.documents?.some((d) => d.status !== "complete"));
  const recent = sorted.slice(0, 20);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <FileText className="h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">No contracts yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {(noContract.length > 0 || missingDocs.length > 0) && (
        <div className="flex items-center gap-2 bg-red-50 px-5 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span className="text-sm font-semibold text-red-800">
            {noContract.length > 0 && `${noContract.length} no contract`}
            {noContract.length > 0 && missingDocs.length > 0 && " · "}
            {missingDocs.length > 0 && `${missingDocs.length} missing docs`}
          </span>
        </div>
      )}
      {recent.map((c) => (
        <div key={c.ref} className="px-5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 truncate">{c.employer || c.ref}</span>
                {c.hasContract ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Contract
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    <X className="h-3 w-3" />
                    No Contract
                  </span>
                )}
                {c.documents && c.documents.filter((d) => d.status !== "complete").length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    {c.documents.filter((d) => d.status !== "complete").length} pending
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
                <span>Ref: {c.ref}</span>
                {c.maid && <span>Maid: {c.maid}</span>}
                {c.maidNationality && <span>{c.maidNationality}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(c.date)}
                </span>
              </div>
              {c.documents && c.documents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.documents.map((doc, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                        doc.status === "complete"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {doc.name}
                      {doc.status !== "complete" && " (pending)"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(c)}
              className="shrink-0 gap-1.5 text-[12px]"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
          </div>
        </div>
      ))}
      {sorted.length > 20 && (
        <div className="px-5 py-2.5 text-center">
          <span className="text-[12px] font-medium text-gray-500">+ {sorted.length - 20} more contracts</span>
        </div>
      )}
    </div>
  );
}

// ─── AI Command Center ──────────────────────────────────────────────────────

type AiTopic = "enquiries" | "requests" | "applicants" | "contracts";

const AI_TOPIC_META: Record<AiTopic, { label: string; icon: React.ElementType; color: string; bg: string; borderColor: string; description: string; prompts: string[] }> = {
  enquiries: {
    label: "Enquiries",
    icon: MessageSquare,
    color: "text-sky-700",
    bg: "bg-sky-50",
    borderColor: "border-sky-200",
    description: "AI assists with enquiry management, reply drafting, and lead triage",
    prompts: ["Summarize new enquiries", "Draft a reply", "Which enquiries are urgent?", "Triage by priority"],
  },
  requests: {
    label: "Requests",
    icon: Inbox,
    color: "text-amber-700",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "AI assists with request tracking, maid matching, and follow-ups",
    prompts: ["Show pending requests", "Match maids to request", "Draft follow-up message", "Which requests need attention?"],
  },
  applicants: {
    label: "Applicants",
    icon: Users,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    borderColor: "border-indigo-200",
    description: "AI assists with applicant screening, scoring, and recruitment workflow",
    prompts: ["Screen top applicants", "Which applicants are ready?", "Summarize applicant pipeline", "Compare applicants"],
  },
  contracts: {
    label: "Contracts",
    icon: FileText,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "AI assists with contract status, document tracking, and employer management",
    prompts: ["Show contracts missing docs", "Which contracts are pending?", "Summarize contract status", "List expiring contracts"],
  },
};

function TopicSelector({ onSelect, enquiryCount, requestCount, applicantCount, contractCount }: {
  onSelect: (topic: AiTopic) => void;
  enquiryCount: number;
  requestCount: number;
  applicantCount: number;
  contractCount: number;
}) {
  const counts = { enquiries: enquiryCount, requests: requestCount, applicants: applicantCount, contracts: contractCount };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Bot className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-bold text-gray-900">Choose a topic for AI assistance</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(AI_TOPIC_META) as AiTopic[]).map((topic) => {
          const meta = AI_TOPIC_META[topic];
          const Icon = meta.icon;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onSelect(topic)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${meta.bg} ${meta.color} ${meta.borderColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-lg font-extrabold text-gray-900">{counts[topic]}</span>
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">{meta.label}</p>
              <p className="mt-1 text-[11px] text-gray-500 leading-snug">{meta.description}</p>
              <p className="mt-2 text-[11px] font-semibold text-primary underline-offset-2">Start AI chat →</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiChatPanel() {
  const { isSubmitting, error, history, submitInquiry, clearConversation } = useAiInquiry();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const payload = {
      name: name.trim() || "Agency Admin",
      contact: contact.trim() || "admin",
      message: message.trim(),
    };
    try {
      await submitInquiry(payload);
      setMessage("");
    } catch {
      /* error handled by hook */
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border shadow-sm">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Assistant</h3>
            <p className="text-[11px] text-violet-100">Process inquiries & get instant maid matches</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearConversation}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-violet-100 hover:bg-white/10 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chat history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4 min-h-[300px] max-h-[400px]">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <Sparkles className="h-6 w-6 text-violet-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">Start a conversation</p>
            <p className="mt-1 text-[12px] text-gray-500 max-w-[240px]">
              Type an inquiry below. The AI will analyze it, match maids, and suggest a reply.
            </p>
          </div>
        ) : (
          history.map((item) => <ChatMessage key={item.id} item={item} />)
        )}
        {isSubmitting && (
          <div className="flex items-center gap-2 pl-2">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span className="text-[12px] text-gray-500">AI is thinking...</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="border-t bg-gray-50/50 p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="h-9 text-[13px]"
          />
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contact (optional)"
            className="h-9 text-[13px]"
          />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type an inquiry or message..."
            className="flex-1 text-[13px]"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !message.trim()}
            className="gap-1.5 bg-violet-700 hover:bg-violet-800"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

function ChatMessage({ item }: { item: InquiryConversationItem }) {
  const isUser = item.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isUser
              ? "bg-violet-600 text-white rounded-br-md"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
          }`}
        >
          {item.content}
        </div>
        {item.meta && !isUser && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            {item.meta.aiUsed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </span>
            )}
            {item.meta.intent && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                {item.meta.intent}
              </span>
            )}
            {item.meta.matches && item.meta.matches.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                <Users className="h-2.5 w-2.5" /> {item.meta.matches.length} matches
              </span>
            )}
            {item.meta.makeTriggered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                <CheckCircle2 className="h-2.5 w-2.5" /> Automated
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TopRequestedMaidsCard({ requests }: { requests: RequestRecord[] }) {
  const topMaids = useMemo(() => {
    const countMap = new Map<string, { ref: string; name: string; nationality: string; count: number }>();
    for (const req of requests) {
      for (const maid of req.maids) {
        const existing = countMap.get(maid.referenceCode);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(maid.referenceCode, {
            ref: maid.referenceCode,
            name: maid.fullName,
            nationality: maid.nationality,
            count: 1,
          });
        }
      }
    }
    return Array.from(countMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [requests]);

  return (
    <Card className="overflow-hidden border shadow-sm">
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Top Requested Maids</h3>
          <p className="text-[11px] text-emerald-50">Most frequently shortlisted across all requests</p>
        </div>
      </div>
      <div className="p-4">
        {topMaids.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <TrendingUp className="h-8 w-8 text-gray-300" />
            <p className="mt-2 text-[12px] text-gray-500">No request data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topMaids.map((maid, i) => (
              <div key={maid.ref} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-200 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{maid.name}</p>
                  <p className="text-[11px] text-gray-500">{maid.ref} · {maid.nationality}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {maid.count}× requested
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function AdPreviewCard() {
  const [adText, setAdText] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!adText.trim()) {
      toast.error("Enter a description for the ad");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/direct-marketing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify({
          goal: "custom",
          tone: "warm",
          maidReferences: [],
          audienceType: "all_contacts",
          customNote: adText,
        }),
      });
      const d = await readSafeJson<{ campaign?: Campaign; error?: string }>(res);
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`);
      if (d.campaign?.messages?.[0]) {
        setAdText(d.campaign.messages[0].message);
        setGenerated(true);
        toast.success("Ad copy generated!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(adText);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <Wand2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Ad Preview</h3>
          <p className="text-[11px] text-amber-50">Generate & preview marketing copy</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Describe what to promote</label>
          <Textarea
            value={adText}
            onChange={(e) => { setAdText(e.target.value); setGenerated(false); }}
            placeholder="e.g. Promote our experienced Filipino maids with childcare expertise"
            className="mt-1 min-h-[70px] resize-y text-[13px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {generating ? "Generating..." : "Generate Ad"}
          </Button>
          {generated && (
            <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          )}
        </div>
        {generated && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Preview</p>
            <p className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap">{adText}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface CommandCenterMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function AiCommandCenterBubble({ enquiries, requests, applicants, contracts }: {
  enquiries: EnquiryRecord[];
  requests: RequestRecord[];
  applicants: AtsApplication[];
  contracts: EmployerRow[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "chat" | "actions">("insights");
  const [messages, setMessages] = useState<CommandCenterMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const analytics = useMemo(() => {
    const urgentEnquiries = enquiries.filter((e) => e.status === "new" || e.status === "in_progress");
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const topApplicants = applicants.filter((a) => (a.score?.score ?? 0) >= 80);
    const noContract = contracts.filter((c) => !c.hasContract);
    return {
      totalEnquiries: enquiries.length,
      urgentEnquiries: urgentEnquiries.length,
      totalRequests: requests.length,
      pendingRequests: pendingRequests.length,
      totalApplicants: applicants.length,
      topApplicants: topApplicants.length,
      totalContracts: contracts.length,
      missingContracts: noContract.length,
    };
  }, [enquiries, requests, applicants, contracts]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Welcome! I'm your AI Command Center assistant. I've analyzed your entire agency pipeline:\n\n• **${analytics.totalEnquiries}** enquiries (${analytics.urgentEnquiries} urgent)\n• **${analytics.totalRequests}** requests (${analytics.pendingRequests} pending)\n• **${analytics.totalApplicants}** applicants (${analytics.topApplicants} scoring 80+)\n• **${analytics.totalContracts}** contracts (${analytics.missingContracts} missing docs)\n\nAsk me anything about your operations — I can analyze data, draft replies, suggest actions, and more.`,
      }]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a context string from the agency's live data
  const buildDataContext = useCallback(() => {
    const parts: string[] = [];
    const safeSlice = (v: unknown, len: number) => String(v ?? "").slice(0, len);

    const urgentEnqs = enquiries.filter((e) => e.status === "new" || e.status === "in_progress");
    if (enquiries.length > 0) {
      parts.push(`ENQUIRIES (${enquiries.length} total, ${urgentEnqs.length} urgent):`);
      urgentEnqs.slice(0, 10).forEach((e) => {
        parts.push(`  - [${e.status || "new"}] ${e.username || "Anonymous"}: "${safeSlice(e.message, 120)}" (${e.email || e.phone || "no contact"}) - ${formatDate(e.createdAt)}`);
      });
    }

    const pendingReqs = requests.filter((r) => r.status === "pending");
    if (requests.length > 0) {
      parts.push(`\nREQUESTS (${requests.length} total, ${pendingReqs.length} pending):`);
      requests.slice(0, 10).forEach((r) => {
        const maidNames = (r.maids || []).map((m) => m.fullName || m.referenceCode).join(", ");
        parts.push(`  - [${r.status || "pending"}] ${r.client?.name || "Unknown"}: ${safeSlice(r.summary, 120)}${maidNames ? ` (Maids: ${maidNames})` : ""}${r.budget ? ` Budget: $${r.budget}` : ""}`);
      });
    }

    if (applicants.length > 0) {
      parts.push(`\nAPPLICANTS (${applicants.length} total):`);
      applicants.slice(0, 10).forEach((a) => {
        const p: Partial<AtsProfile> = a.profile || {};
        parts.push(`  - ${p.fullName || "Unnamed"} (${p.nationality || "N/A"}, ${p.yearsOfExperience ?? 0}y exp, score: ${a.score?.score ?? "N/A"}, ${a.status || "pending"}) - Skills: ${(p.languageSkills || []).join(", ") || "N/A"}, Childcare: ${p.childcareExperience ?? 0}y, Elderly: ${p.elderlyCareExperience ?? 0}y`);
      });
    }

    const noContract = contracts.filter((c) => !c.hasContract);
    if (contracts.length > 0) {
      parts.push(`\nCONTRACTS (${contracts.length} total, ${noContract.length} missing contract):`);
      contracts.slice(0, 10).forEach((c) => {
        const docs = (c.documents || []).map((d) => `${d.name}:${d.status}`).join(", ") || "none";
        parts.push(`  - ${c.employer || c.ref} → ${c.maid || "N/A"} (${c.hasContract ? "Has contract" : "NO CONTRACT"}) ${c.maidNationality || ""} Docs: ${docs}`);
      });
    }

    return parts.join("\n");
  }, [enquiries, requests, applicants, contracts]);

  // Call AI API via backend proxy (avoids CORS issues from browser)
  const callClaude = useCallback(async (conversationHistory: CommandCenterMessage[]): Promise<string> => {
    const dataContext = buildDataContext();

    const systemPrompt = `You are an intelligent AI assistant for a domestic worker (maid) agency. You are the agency admin's right-hand assistant — knowledgeable, proactive, and helpful. You have access to the agency's live operational data.

Your personality:
- Professional yet warm and approachable
- Proactive — suggest actions, not just answers
- Data-driven — reference specific records by name
- Concise but thorough
- Use markdown formatting for readability (bold, bullet points, etc.)

Your capabilities:
- Analyze enquiries, requests, applicants, and contracts
- Draft professional replies to client enquiries
- Suggest maid matches for pending requests
- Identify urgent items that need attention
- Provide pipeline health summaries
- Draft marketing content
- Suggest workflow improvements

--- LIVE AGENCY DATA ---
${dataContext || "No data available yet."}
--- END DATA ---

Always reference actual records from the data above when responding. Be specific with names, scores, and statuses. If the user asks about something not in the data, let them know what you can see and suggest how to get the information they need.`;

    const apiMessages = conversationHistory
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    // Call the backend proxy endpoint (Cloudflare Worker handles CORS)
    const response = await fetch("/api/ai/command-center/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages, system: systemPrompt }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errData.error || `AI request failed (${response.status})`);
    }

    const data = await response.json() as { reply?: string; error?: string };
    if (data.error) throw new Error(data.error);
    return data.reply || "I couldn't generate a response. Please try again.";
  }, [buildDataContext]);

  const handleSubmit = async (text?: string) => {
    const msg = (text ?? message).trim();
    if (!msg || isSubmitting) return;
    setMessage("");
    setError(null);

    const userMsg: CommandCenterMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsSubmitting(true);

    try {
      const aiResponse = await callClaude(updatedMessages);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: aiResponse,
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI response");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 pl-5 pr-4 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.03] active:scale-[0.97]"
          aria-label="Open AI Command Center"
        >
          <Bot className="h-5 w-5 shrink-0" />
          <span className="hidden whitespace-nowrap text-sm font-bold sm:inline">AI Command</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold tabular-nums">
            {analytics.totalEnquiries + analytics.totalRequests + analytics.totalApplicants}
          </span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[600px] w-full max-w-[420px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:rounded-2xl">
          {/* Header */}
          <div className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Command Center</h3>
                  <p className="text-[11px] text-violet-100">
                    {analytics.totalEnquiries + analytics.totalRequests + analytics.totalApplicants} records · Cline AI powered
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-violet-100 transition hover:bg-white/15" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="mt-3 flex gap-1 rounded-xl bg-white/10 p-1">
              {([
                { key: "insights" as const, label: "Insights", icon: BarChart3 },
                { key: "chat" as const, label: "Chat", icon: MessageCircle },
                { key: "actions" as const, label: "Actions", icon: Zap },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ── Insights Tab ── */}
            {activeTab === "insights" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-600" />
                    <p className="text-xs font-bold text-slate-800">Pipeline Health</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Urgent Enquiries", value: analytics.urgentEnquiries, color: "text-red-700 bg-red-50", icon: AlertCircle },
                      { label: "Pending Requests", value: analytics.pendingRequests, color: "text-amber-700 bg-amber-50", icon: Clock },
                      { label: "Top Applicants (80+)", value: analytics.topApplicants, color: "text-indigo-700 bg-indigo-50", icon: Star },
                      { label: "Missing Contracts", value: analytics.missingContracts, color: "text-emerald-700 bg-emerald-50", icon: AlertTriangle },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-lg font-black leading-none text-slate-900 tabular-nums">{item.value}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Enquiries", value: analytics.totalEnquiries, color: "text-sky-700" },
                    { label: "Requests", value: analytics.totalRequests, color: "text-amber-700" },
                    { label: "Applicants", value: analytics.totalApplicants, color: "text-indigo-700" },
                    { label: "Contracts", value: analytics.totalContracts, color: "text-emerald-700" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-2.5 text-center">
                      <p className={`text-lg font-black ${item.color} tabular-nums`}>{item.value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-indigo-800">AI Recommendation</p>
                      <p className="mt-1 text-[11px] leading-5 text-indigo-700">
                        {analytics.urgentEnquiries > 0
                          ? `${analytics.urgentEnquiries} enquiries need immediate attention. Prioritize replying to new and in-progress leads.`
                          : analytics.pendingRequests > 3
                          ? `${analytics.pendingRequests} requests are pending. Consider matching maids to expedite hiring.`
                          : analytics.missingContracts > 0
                          ? `${analytics.missingContracts} contracts are missing documents. Follow up with employers.`
                          : "Your pipeline looks healthy! Keep monitoring for new activity."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Chat Tab ── */}
            {activeTab === "chat" && (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                            isUser ? "bg-violet-600 text-white rounded-br-md" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md"
                          }`}>
                            {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                              if (part.startsWith("**") && part.endsWith("**")) {
                                return <strong key={i} className={isUser ? "text-white" : "text-slate-950"}>{part.slice(2, -2)}</strong>;
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isSubmitting && (
                    <div className="flex items-center gap-2 pl-1">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-[11px] text-slate-400">AI Command Center thinking...</span>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
                  )}
                </div>

                {messages.length <= 1 && !isSubmitting && (
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2.5">
                    {[
                      { label: "Pipeline summary", icon: BarChart3 },
                      { label: "Draft enquiry reply", icon: Mail },
                      { label: "Show pending requests", icon: Inbox },
                      { label: "Top applicants", icon: Users },
                    ].map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => void handleSubmit(q.label)}
                        className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        <q.icon className="h-2.5 w-2.5" />
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-3">
                  <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask about your operations..."
                      className="flex-1 text-[12.5px] bg-white"
                      disabled={isSubmitting}
                    />
                    <Button type="submit" size="sm" disabled={isSubmitting || !message.trim()} className="gap-1 bg-violet-600 hover:bg-violet-700">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* ── Actions Tab ── */}
            {activeTab === "actions" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Content Generation */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800">AI Content Generation</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Generate ad copy", desc: "AI-powered marketing content", action: () => void handleSubmit("Generate a promotional ad for our maid agency services") },
                      { label: "Draft enquiry reply", desc: "AI writes professional responses", action: () => void handleSubmit("Draft a professional reply to the latest enquiry") },
                      { label: "Write maid description", desc: "Create compelling maid profiles", action: () => void handleSubmit("Help me write a compelling maid profile description") },
                    ].map((item) => (
                      <button key={item.label} type="button" onClick={item.action} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-amber-200 hover:bg-amber-50">
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-slate-800">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workflow Automation */}
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-600" />
                    <p className="text-xs font-bold text-violet-800">Workflow Automation</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Post to Make workflow", desc: "Send AI report to automation", action: () => void handleSubmit("Generate a pipeline report and post to Make workflow") },
                      { label: "Triage enquiries", desc: "AI prioritizes all open leads", action: () => void handleSubmit("Triage all open enquiries by priority and suggest actions") },
                      { label: "Match maids to requests", desc: "AI matches pending requests", action: () => void handleSubmit("Review pending requests and suggest maid matches") },
                    ].map((item) => (
                      <button key={item.label} type="button" onClick={item.action} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-violet-200 hover:bg-violet-50">
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-slate-800">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Operations */}
                <div className="rounded-xl border border-slate-100 bg-white p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <p className="text-xs font-bold text-slate-800">Quick Operations</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Show urgent enquiries", desc: `${analytics.urgentEnquiries} need attention`, action: () => void handleSubmit("Show me all urgent enquiries that need attention") },
                      { label: "Applicant screening", desc: `${analytics.topApplicants} scoring 80+`, action: () => void handleSubmit("Screen top applicants and summarize their profiles") },
                      { label: "Contract status", desc: `${analytics.missingContracts} missing docs`, action: () => void handleSubmit("Show me contracts with missing documents") },
                    ].map((item) => (
                      <button key={item.label} type="button" onClick={item.action} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-slate-800">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Marketing Messaging ────────────────────────────────────────────────────

function MarketingMessaging() {
  const [message, setMessage] = useState("");
  const [audienceType, setAudienceType] = useState<string>("enquiry_leads");
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [audienceCounts, setCounts] = useState<Record<string, number>>({});
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    const types = ["all_contacts", "all_clients", "enquiry_leads", "direct_sale_leads"];
    const results: Record<string, number> = {};
    for (const t of types) {
      try {
        const res = await fetch(`/api/ai/direct-marketing/audience?type=${t}`, {
          headers: getAgencyAdminAuthHeaders(),
        });
        if (res.ok) {
          const d = await readSafeJson<{ total?: number; error?: string }>(res);
          results[t] = d.total ?? 0;
        }
      } catch {
        results[t] = 0;
      }
    }
    setCounts(results);
  }, []);

  useEffect(() => { void loadCounts(); }, [loadCounts]);

  const handleGenerate = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message or goal for the campaign");
      return;
    }
    setGenerating(true);
    setCampaign(null);
    try {
      const res = await fetch("/api/ai/direct-marketing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify({
          goal: "custom",
          tone: "warm",
          maidReferences: [],
          audienceType,
          customNote: message,
        }),
      });
      const d = await readSafeJson<{ campaign?: Campaign; error?: string }>(res);
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`);
      if (d.campaign) {
        setCampaign(d.campaign);
        toast.success(`${d.campaign.contactCount} messages generated`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const audienceOptions = [
    { value: "all_contacts", label: "All Contacts", count: audienceCounts.all_contacts ?? 0 },
    { value: "all_clients", label: "Clients", count: audienceCounts.all_clients ?? 0 },
    { value: "enquiry_leads", label: "Enquiry Leads", count: audienceCounts.enquiry_leads ?? 0 },
    { value: "direct_sale_leads", label: "Direct Leads", count: audienceCounts.direct_sale_leads ?? 0 },
  ];

  return (
    <Card className="overflow-hidden border shadow-sm">
      <div className="border-b bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Advertising & Outreach</h3>
            <p className="text-sm text-gray-600">Create email or WhatsApp messages to promote maids or follow up with leads</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="text-sm font-bold text-gray-800">Send to</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {audienceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAudienceType(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  audienceType === opt.value
                    ? "border-violet-300 bg-violet-50 text-violet-800"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                {opt.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  audienceType === opt.value ? "bg-violet-200 text-violet-800" : "bg-gray-100 text-gray-600"
                }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-800">What to advertise or say</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Promote our new FDW arrivals from Myanmar, experienced in childcare. Use a warm tone."
            className="mt-1.5 min-h-[80px] resize-y text-sm text-gray-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2 bg-violet-700 text-white hover:bg-violet-800"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Messages"}
          </Button>
          {campaign && (
            <span className="text-sm font-medium text-emerald-700">
              {campaign.contactCount} messages · {campaign.whatsappReadyCount} WhatsApp-ready
            </span>
          )}
        </div>

        {campaign && campaign.messages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">Generated Messages</p>
            {campaign.messages.map((msg) => (
              <div
                key={msg.contactId}
                className="rounded-xl border bg-card transition hover:shadow-sm"
              >
                <div className="flex items-center gap-3 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-indigo-200 text-xs font-bold text-violet-800">
                    {msg.contactName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900 truncate">{msg.contactName}</span>
                      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                        {msg.contactSource}
                      </span>
                      {msg.charCount > 300 && (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          {msg.charCount} chars
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-gray-500">
                      {msg.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{msg.contactPhone}</span>}
                      {msg.contactEmail && <span className="truncate max-w-[160px]">{msg.contactEmail}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {msg.whatsappLink ? (
                      <a
                        href={msg.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <ExternalLink className="h-3 w-3" /> Send
                      </a>
                    ) : (
                      <span className="flex h-7 items-center rounded-md border border-dashed px-2.5 text-[12px] text-gray-400">
                        No phone
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedMsg(expandedMsg === msg.contactId ? null : msg.contactId)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border text-gray-500 hover:bg-muted"
                    >
                      {expandedMsg === msg.contactId ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {expandedMsg === msg.contactId && (
                  <div className="border-t bg-muted/30 px-3.5 py-3">
                    <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">{msg.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                      <span>{msg.charCount} characters</span>
                      {msg.contactEmail && (
                        <a
                          href={`mailto:${msg.contactEmail}`}
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                        >
                          <Mail className="h-3 w-3" /> Email
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type ModalType = "enquiries" | "requests" | "applicants" | "contracts";

function AddApplicantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    whatsappNumber: "",
    nationality: "",
    dateOfBirth: "",
    gender: "Female",
    maritalStatus: "",
    address: "",
    yearsOfExperience: "0",
    childcareExperience: "0",
    newbornCareExperience: "0",
    elderlyCareExperience: "0",
    disabledCareExperience: "0",
    housekeepingExperience: "0",
    petCareExperience: "0",
    cookingSkills: "",
    languageSkills: "",
    certifications: "",
    availableDate: "",
    expectedSalary: "",
    employmentPreference: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.contactNumber.trim()) {
      toast.error("Full name, email, and contact number are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ats/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify(form),
      });
      const d = await readSafeJson<{ applicationId?: string; applicationCode?: string; error?: string }>(res);
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`);
      toast.success(`Applicant created: ${d.applicationCode ?? d.applicationId}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create applicant");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Users className="h-5 w-5 text-indigo-600" />
            Add New Applicant
          </DialogTitle>
          <DialogDescription>Create a new job applicant record</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DetailSection title="Required Information">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Full Name *</label>
                  <input className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Email *</label>
                  <input className={inputClass} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Contact Number *</label>
                  <input className={inputClass} value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} placeholder="+65 9123 4567" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">WhatsApp Number</label>
                  <input className={inputClass} value={form.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} placeholder="Same as contact if empty" />
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Personal Information">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Nationality</label>
                  <input className={inputClass} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="Filipino" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Date of Birth</label>
                  <input className={inputClass} type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Gender</label>
                  <select className={inputClass} value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Marital Status</label>
                  <input className={inputClass} value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)} placeholder="Single" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Address</label>
                  <input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Home country address" />
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Experience (years)">
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ["yearsOfExperience", "Total Experience"],
                  ["childcareExperience", "Childcare"],
                  ["newbornCareExperience", "Newborn Care"],
                  ["elderlyCareExperience", "Elderly Care"],
                  ["disabledCareExperience", "Disabled Care"],
                  ["housekeepingExperience", "Housekeeping"],
                  ["petCareExperience", "Pet Care"],
                ] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</label>
                    <input className={inputClass} type="number" min="0" value={form[field]} onChange={(e) => update(field, e.target.value)} />
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Skills & Preferences">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Language Skills (comma-separated)</label>
                  <input className={inputClass} value={form.languageSkills} onChange={(e) => update("languageSkills", e.target.value)} placeholder="English, Tagalog" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Cooking Skills (comma-separated)</label>
                  <input className={inputClass} value={form.cookingSkills} onChange={(e) => update("cookingSkills", e.target.value)} placeholder="Chinese, Western" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Certifications (comma-separated)</label>
                  <input className={inputClass} value={form.certifications} onChange={(e) => update("certifications", e.target.value)} placeholder="First Aid, CPR" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Available Date</label>
                  <input className={inputClass} type="date" value={form.availableDate} onChange={(e) => update("availableDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Expected Salary (SGD/mo)</label>
                  <input className={inputClass} type="number" min="0" value={form.expectedSalary} onChange={(e) => update("expectedSalary", e.target.value)} placeholder="600" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Employment Preference</label>
                  <input className={inputClass} value={form.employmentPreference} onChange={(e) => update("employmentPreference", e.target.value)} placeholder="Live-in" />
                </div>
              </div>
            </DetailSection>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create Applicant
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function AiAgentsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardView, setDashboardView] = useState<ModalType | null>(null);

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [applicants, setApplicants] = useState<AtsApplication[]>([]);
  const [contracts, setContracts] = useState<EmployerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail modal states
  const [viewEnquiry, setViewEnquiry] = useState<EnquiryRecord | null>(null);
  const [viewRequest, setViewRequest] = useState<RequestRecord | null>(null);
  const [viewApplicant, setViewApplicant] = useState<AtsApplication | null>(null);
  const [viewContract, setViewContract] = useState<EmployerRow | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [enqRes, reqRes, atsRes, empRes] = await Promise.allSettled([
        fetch("/api/enquiries?pageSize=100", { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/requests?pageSize=100", { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/ats/applications?pageSize=100", { headers: getAgencyAdminAuthHeaders() }),
        fetch("/api/employers", { headers: getAgencyAdminAuthHeaders() }),
      ]);

      if (enqRes.status === "fulfilled") {
        const d = await readSafeJson<{ enquiries?: EnquiryRecord[]; error?: string }>(enqRes.value);
        if (d.enquiries) setEnquiries(d.enquiries);
      }
      if (reqRes.status === "fulfilled") {
        const d = await readSafeJson<{ data?: RequestRecord[]; error?: string }>(reqRes.value);
        if (d.data) setRequests(d.data);
      }
      if (atsRes.status === "fulfilled") {
        const d = await readSafeJson<{ data?: AtsApplication[]; error?: string }>(atsRes.value);
        // Only show public FDW form submissions (source: "resume_upload"),
        // not synced maids (source: "synced_from_maid").
        if (d.data) setApplicants(d.data.filter((app) => app.source === "resume_upload"));
      }
      if (empRes.status === "fulfilled") {
        const d = await readSafeJson<{ employers?: Array<Record<string, unknown>>; error?: string }>(empRes.value);
        if (d.employers) {
          const rows: EmployerRow[] = d.employers.map((record) => {
            const emp = (record.employer as Record<string, unknown>) || {};
            const maid = (record.maid as Record<string, unknown>) || {};
            const agency = (record.agency as Record<string, unknown>) || {};
            const spouse = (record.spouse as Record<string, unknown>) || {};
            const docs = (record.documents as Array<{ name: string; status: string }>) || [];
            const contractDate = String(agency.contractDate ?? "");
            const photoArr = Array.isArray(maid.photoDataUrls)
              ? (maid.photoDataUrls as string[]).filter((v) => typeof v === "string" && v.trim().length > 0)
              : [];
            return {
              ref: String(record.refCode ?? "").trim(),
              date: contractDate || String(record.updatedAt ?? record.createdAt ?? ""),
              employer: String(emp.name ?? ""),
              employerNationality: String(emp.nationality ?? ""),
              spouse: String(spouse.name ?? ""),
              spouseNationality: String(spouse.nationality ?? ""),
              maid: String(maid.name ?? ""),
              maidPhoto: photoArr[0] || String(maid.photoDataUrl ?? ""),
              maidNationality: String(maid.nationality ?? ""),
              documents: docs,
              hasContract: Boolean(agency.contractDate),
              agency,
              maidDetails: maid,
              employerDetails: emp,
              spouseDetails: spouse,
              familyMembers: Array.isArray(record.familyMembers) ? record.familyMembers : [],
              notificationDate: record.notificationDate as Record<string, unknown> | undefined,
              createdAt: String(record.createdAt ?? ""),
              updatedAt: String(record.updatedAt ?? ""),
            };
          });
          setContracts(rows.filter((r) => r.ref));
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const urgentEnquiries = enquiries.filter((e) => e.status === "new" || e.status === "in_progress").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const noContractCount = contracts.filter((c) => !c.hasContract).length;

  const cardConfigs = [
    { key: "enquiries" as ModalType, label: "Enquiries", count: enquiries.length, urgent: urgentEnquiries, icon: MessageSquare, color: "bg-sky-50 text-sky-700 border-sky-200" },
    { key: "requests" as ModalType, label: "Requests", count: requests.length, urgent: pendingRequests, icon: Inbox, color: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "applicants" as ModalType, label: "Applicants", count: applicants.length, urgent: 0, icon: Users, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { key: "contracts" as ModalType, label: "Contracts", count: contracts.length, urgent: noContractCount, icon: FileText, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ];

  const renderDashboardList = () => {
    if (dashboardView === "enquiries") {
      return (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between border-b bg-sky-50/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-gray-900">All Enquiries ({enquiries.length})</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDashboardView(null)} className="gap-1.5 text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
          <EnquiriesList enquiries={enquiries} onView={setViewEnquiry} />
        </Card>
      );
    }
    if (dashboardView === "requests") {
      return (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between border-b bg-amber-50/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-900">All Requests ({requests.length})</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDashboardView(null)} className="gap-1.5 text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
          <RequestsList requests={requests} onView={setViewRequest} />
        </Card>
      );
    }
    if (dashboardView === "applicants") {
      return (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between border-b bg-indigo-50/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">All Applicants ({applicants.length})</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDashboardView(null)} className="gap-1.5 text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
          <ApplicantsList applicants={applicants} onView={setViewApplicant} />
        </Card>
      );
    }
    if (dashboardView === "contracts") {
      return (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between border-b bg-emerald-50/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">All Contracts ({contracts.length})</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDashboardView(null)} className="gap-1.5 text-[12px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
          <ContractsList contracts={contracts} onView={setViewContract} />
        </Card>
      );
    }
    // No card selected - show a prompt
    return (
      <Card className="overflow-hidden border shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Sparkles className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-bold text-gray-900">Select a category to view</h3>
          <p className="mt-1 text-sm text-gray-500">
            Click one of the cards above to see the full list of enquiries, requests, applicants, or contracts.
          </p>
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">AI Agents Dashboard</h1>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              Overview of all enquiries, requests, applicants, contracts, and marketing tools
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards — clickable to show full list in dashboard */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cardConfigs.map(({ key, label, count, urgent, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setDashboardView(key)}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              dashboardView === key ? "ring-2 ring-primary/40 border-primary/40" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              {urgent > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  {urgent} urgent
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-extrabold text-gray-900">{count}</p>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-1 text-[11px] font-semibold text-primary underline-offset-2">
              {dashboardView === key ? "Showing list ↓" : "View list →"}
            </p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="rounded-xl border bg-card p-1.5 shadow-sm">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-transparent p-0">
            {[
              { value: "dashboard", label: "Dashboard", icon: Sparkles },
              { value: "marketing", label: "Advertising", icon: Send },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-h-9 gap-2 rounded-lg px-4 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-0 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            renderDashboardList()
          )}
        </TabsContent>

        {/* AI Command Center Bubble rendered outside tabs */}
        <AiCommandCenterBubble enquiries={enquiries} requests={requests} applicants={applicants} contracts={contracts} />
        {/* Marketing Tab */}
        <TabsContent value="marketing" className="mt-0 space-y-3">
          <MarketingMessaging />
        </TabsContent>
      </Tabs>

      {/* Detail Modals */}
      <EnquiryDetailModal enquiry={viewEnquiry} onClose={() => setViewEnquiry(null)} />
      <RequestDetailModal request={viewRequest} onClose={() => setViewRequest(null)} />
      <ApplicantDetailModal applicant={viewApplicant} onClose={() => setViewApplicant(null)} />
      <ContractDetailModal contract={viewContract} onClose={() => setViewContract(null)} />
    </div>
  );
}
