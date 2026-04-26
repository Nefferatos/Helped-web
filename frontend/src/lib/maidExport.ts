import { MaidProfile } from "@/lib/maids";

let pdfLibLoader: Promise<typeof import("pdf-lib")> | null = null;

const loadPdfLib = async () => {
  pdfLibLoader ??= import("pdf-lib");
  return await pdfLibLoader;
};

// ── html2canvas + jsPDF loaders (lazy, fully typed) ────────────────────────
// These types match the actual default exports without using `any`.
type Html2CanvasFn = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type JsPDFConstructor = new (options?: { orientation?: string; unit?: string; format?: string }) => {
  addPage: () => void;
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  setProperties: (props: { title?: string; subject?: string; author?: string; creator?: string }) => void;
  save: (filename: string) => void;
};

let html2canvasLoader: Promise<Html2CanvasFn> | null = null;
let jsPdfLoader: Promise<JsPDFConstructor> | null = null;

const loadHtml2Canvas = async (): Promise<Html2CanvasFn> => {
  if (!html2canvasLoader) {
    html2canvasLoader = import(
      /* webpackChunkName: "html2canvas" */ "html2canvas"
    ).then((mod) => (mod.default ?? mod) as Html2CanvasFn);
  }
  return html2canvasLoader;
};

const loadJsPdf = async (): Promise<JsPDFConstructor> => {
  if (!jsPdfLoader) {
    jsPdfLoader = import(
      /* webpackChunkName: "jspdf" */ "jspdf"
    ).then((mod) => ((mod as { default?: unknown }).default ?? (mod as { jsPDF?: unknown }).jsPDF ?? mod) as JsPDFConstructor);
  }
  return jsPdfLoader;
};

// ── Helpers ────────────────────────────────────────────────────────────────
const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmtDate = (v?: string) => {
  if (!v) return "N/A";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-SG");
};

const calcAge = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

const yesNo = (v: boolean) => (v ? "Yes" : "No");

const encodeBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
};

const toCsvCell = (value: unknown) => {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const buildImportPayload = (maid: MaidProfile) => {
  const { id, createdAt, updatedAt, photoDataUrl, photoDataUrls, videoDataUrl, ...rest } = maid;
  return { ...rest, photoDataUrl: "", photoDataUrls: [], videoDataUrl: "" } satisfies MaidProfile;
};

// Single-profile export includes photos so they survive the import round-trip.
const buildImportPayloadWithPhoto = (maid: MaidProfile) => {
  const { id, createdAt, updatedAt, videoDataUrl, ...rest } = maid;
  return { ...rest, videoDataUrl: "" } satisfies MaidProfile;
};

const buildMaidsCsv = (maids: MaidProfile[]) => {
  const columns = [
    "referenceCode",
    "fullName",
    "type",
    "nationality",
    "dateOfBirth",
    "placeOfBirth",
    "height",
    "weight",
    "religion",
    "maritalStatus",
    "numberOfChildren",
    "numberOfSiblings",
    "homeAddress",
    "airportRepatriation",
    "educationLevel",
    "isPublic",
    "hasPhoto",
  ] as const;

  const rows = maids.map((maid) =>
    columns
      .map((column) => toCsvCell(maid[column]))
      .join(",")
  );

  return [columns.join(","), ...rows].join("\n");
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const dataUrlToBytes = (dataUrl: string) => {
  const parts = dataUrl.split(",", 2);
  if (parts.length !== 2) throw new Error("Invalid image data");
  const mimeMatch = parts[0].match(/^data:(.*?);base64$/i);
  const mimeType = mimeMatch?.[1]?.toLowerCase() ?? "";
  const binary = atob(parts[1]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, mimeType };
};

const getPrimaryPhoto = (maid: MaidProfile) =>
  Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
    ? maid.photoDataUrls[0]
    : maid.photoDataUrl || "";

const getSectionRows = (maid: MaidProfile) => {
  const age = calcAge(maid.dateOfBirth);
  const skills = (maid.skillsPreferences as Record<string, unknown>) || {};
  const intro = (maid.introduction as Record<string, unknown>) || {};
  const workAreas = (maid.workAreas as Record<string, unknown>) || {};
  const agencyContact = (maid.agencyContact as Record<string, unknown>) || {};
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  return [
    {
      title: "Profile",
      rows: [
        ["Reference Code", maid.referenceCode],
        ["Full Name", maid.fullName],
        ["Status", maid.status || "available"],
        ["Type", maid.type],
        ["Nationality", maid.nationality],
        ["Date of Birth", fmtDate(maid.dateOfBirth)],
        ["Age", age === null ? "N/A" : `${age}`],
        ["Place of Birth", maid.placeOfBirth],
        ["Religion", maid.religion],
        ["Marital Status", maid.maritalStatus],
        ["Children", maid.numberOfChildren],
        ["Siblings", maid.numberOfSiblings],
        ["Height / Weight", `${maid.height ?? ""} cm / ${maid.weight ?? ""} kg`],
        ["Education", maid.educationLevel],
      ],
    },
    {
      title: "Contact & Availability",
      rows: [
        ["Home Address", maid.homeAddress],
        ["Repatriation Airport", maid.airportRepatriation],
        ["Agency Contact", agencyContact.contactPerson],
        ["Agency Phone", agencyContact.phone],
        ["Passport No", agencyContact.passportNo],
        ["Rest Days / Month", skills.offDaysPerMonth],
        ["Interview Options", Array.isArray(skills.availabilityInterviewOptions) ? skills.availabilityInterviewOptions.join(", ") : ""],
        ["Availability Remark", skills.availabilityRemark],
      ],
    },
    {
      title: "Skills & Introduction",
      rows: [
        ["Languages", Object.entries(maid.languageSkills || {}).map(([name, level]) => `${name}: ${level}`).join(", ")],
        ["Work Areas", Object.entries(workAreas).filter(([, value]) => Boolean(value)).map(([name]) => name).join(", ")],
        ["Public Intro", intro.publicIntro],
        ["Private Intro", intro.intro],
        ["Food Handling", intro.foodHandlingPreferences],
        ["Dietary Restrictions", intro.dietaryRestrictions],
        ["Allergies", intro.allergies],
        ["Physical Disabilities", intro.physicalDisabilities],
      ],
    },
    {
      title: "Employment History",
      rows: employment.length > 0
        ? employment.map((entry, index) => {
            const row = entry as Record<string, unknown>;
            const years = [row.from, row.to].filter(Boolean).join(" - ");
            const description = [
              years,
              row.country,
              row.employer,
              row.duties,
              row.remarks,
            ]
              .filter(Boolean)
              .join(" | ");
            return [`Employer ${index + 1}`, description];
          })
        : [["History", "No employment history recorded"]],
    },
  ];
};

const downloadBytes = (filename: string, bytes: Uint8Array, mimeType: string) => {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  downloadBlob(filename, blob);
};

// ── Embedded assets ────────────────────────────────────────────────────────
const AGENCY_LOGO   = "data:image/jpeg;base64,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";
const FULLBODY_PHOTO = ""

// ── MOM A4 Bio-data HTML builder ───────────────────────────────────────────
const buildMomBiodataHtml = (maid: MaidProfile): string => {
  const agencyContact = (maid.agencyContact ?? {}) as Record<string, unknown>;
  const introduction  = (maid.introduction  ?? {}) as Record<string, unknown>;
  const skillsPref    = (maid.skillsPreferences ?? {}) as Record<string, unknown>;
  const pastIllnesses = ((introduction.pastIllnesses ?? {}) as Record<string, boolean>);
  const workAreas     = Object.entries(maid.workAreas ?? {}) as Array<
    [string, { willing?: boolean; experience?: boolean; evaluation?: string }]
  >;
  const employment    = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];

  // Use profile photo if available, otherwise fall back to embedded full-body
  const photoSrc = photos[1] || photos[0] || FULLBODY_PHOTO;

  const age = calcAge(maid.dateOfBirth);
  const importPayloadBase64 = encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)));

  // ── Work-area rows ──────────────────────────────────────────────────────
  const workAreaRows = (workAreas as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string }]>)
    .map(([area, cfg], idx) => {
      const rating = cfg.evaluation ? String(cfg.evaluation) : "N.A";
      const dots = [1,2,3,4,5].map(n => {
        const active = String(n) === rating;
        return `<span class="dot${active ? " active" : ""}">${n}</span>`;
      }).join("");
      return `<tr>
        <td class="sn">${idx + 1}</td>
        <td class="area-label">${esc(area)}</td>
        <td class="center">${esc(yesNo(cfg.willing ?? false))}</td>
        <td class="center">${esc(yesNo(cfg.experience ?? false))}${cfg.experience && cfg.yearsOfExperience ? `<br/><span style="font-size:8.5pt;">${esc(String(cfg.yearsOfExperience))} yr${String(cfg.yearsOfExperience) === "1" ? "" : "s"}</span>` : ""}</td>
        <td class="assess">${dots} &nbsp;${esc(cfg.evaluation ? "– " + cfg.evaluation : "N.A")}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="5" style="text-align:center;color:#888;">No skill records available.</td></tr>`;

  // ── Employment rows ─────────────────────────────────────────────────────
  const empRows = (employment as Record<string, string>[]).map(e => `<tr>
    <td>${esc(e.from ?? "")}</td>
    <td>${esc(e.to   ?? "")}</td>
    <td>${esc(e.country  ?? "")}</td>
    <td>${esc(e.employer ?? "")}</td>
    <td>${esc(e.duties   ?? "")}</td>
    <td>${esc(e.remarks  ?? "")}</td>
  </tr>`).join("") || `<tr><td colspan="6" style="text-align:center;color:#888;">No employment history recorded.</td></tr>`;

  // ── Remarks ─────────────────────────────────────────────────────────────
  const publicIntro  = String(introduction.publicIntro  ?? "");
  const privateIntro = String(introduction.intro ?? "");
  const remarksText  = [publicIntro, privateIntro].filter(Boolean).join("\n\n") ||
    String(introduction.otherRemarks ?? "");

  // ── CSS ─────────────────────────────────────────────────────────────────
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      padding: 14mm 15mm;
      line-height: 1.45;
    }

    /* ── Agency header ── */
   
    .agency-logo { height: 64px; width: auto; display: block; }
    .agency-license { font-size: 9pt; text-align: right; color: #444; }

    /* ── Main title ── */
    .doc-title {
      text-align: center;
      font-weight: bold;
      font-size: 13pt;
      text-decoration: underline;
      margin-bottom: 4px;
    }
    .doc-note {
      font-size: 8.5pt;
      margin-bottom: 14px;
      font-style: italic;
    }

    /* ── Section labels ── */
    .sec-label {
      font-weight: bold;
      font-size: 11pt;
      text-decoration: underline;
      margin: 12px 0 4px;
    }
    .sub-label {
      font-weight: bold;
      margin: 6px 0 4px;
    }

    /* ── Profile hero: fields left, photo right ── */
    .profile-hero {
      display: grid;
      grid-template-columns: 1fr 160px;
      gap: 12px;
      align-items: start;
    }
    .photo-box img {
      width: 160px;
      height: auto;
      border: 1px solid #aaa;
      display: block;
      object-fit: cover;
    }
    .photo-box .no-photo {
      width: 160px;
      height: 220px;
      border: 1px solid #aaa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #999;
    }

    /* ── Field lines ── */
    .field-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 5px;
      font-size: 10.5pt;
      flex-wrap: wrap;
    }
    .field-num { min-width: 22px; }
    .field-label { min-width: 210px; white-space: nowrap; }
    .field-value {
      border-bottom: 1px solid #555;
      flex: 1;
      padding-bottom: 1px;
      min-height: 16px;
      min-width: 60px;
    }

    /* ── Illness grid ── */
    table.illness {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin: 6px 0;
    }
    table.illness td { padding: 2px 5px; vertical-align: middle; }
    .ill-label { width: 36%; }
    .ill-box, .ill-box-header {
      width: 28px;
      text-align: center;
      border: 1px solid #555;
      font-weight: bold;
    }
    .ill-spacer { width: 20px; }

    /* ── Skills table ── */
    table.skills {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin: 4px 0;
    }
    table.skills th, table.skills td {
      border: 1px solid #555;
      padding: 4px 6px;
      vertical-align: top;
    }
    table.skills thead th { background: #f0f0f0; text-align: center; font-size: 9pt; }
    .sn { width: 26px; text-align: center; }
    .area-label { width: 26%; }
    .center { text-align: center; width: 60px; }
    .assess { font-size: 9pt; }
    .dot { margin: 0 2px; font-size: 9pt; color: #aaa; }
    .dot.active { color: #000; font-weight: bold; text-decoration: underline; }

    /* ── Employment table ── */
    table.emp {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin: 4px 0;
    }
    table.emp th, table.emp td {
      border: 1px solid #555;
      padding: 4px 6px;
      vertical-align: top;
    }
    table.emp thead th { background: #f0f0f0; text-align: center; }

    /* ── Checkbox row ── */
    .checkbox-row { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 10pt; }
    .cb {
      width: 14px; height: 14px;
      border: 1px solid #555;
      display: inline-flex;
      align-items: center; justify-content: center;
      font-size: 9pt; font-weight: bold;
      flex-shrink: 0;
    }

    /* ── Remarks block ── */
    .remarks-box {
      border: 1px solid #555;
      min-height: 90px;
      padding: 8px;
      font-size: 10pt;
      white-space: pre-wrap;
      margin: 4px 0 12px;
    }

    /* ── Signature section ── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; }
    .sig-line { border-top: 1px solid #555; margin-top: 28px; font-size: 9pt; padding-top: 2px; }

    /* ── Footer notes ── */
    .foot-title { font-weight: bold; text-decoration: underline; margin: 12px 0 4px; font-size: 10.5pt; }
    .foot-item { display: flex; gap: 6px; margin: 4px 0; font-size: 9.5pt; }
    .foot-bullet { min-width: 12px; }

    .page-num { text-align: right; font-size: 9pt; margin: 14px 0 4px; }

    @media print {
      body { padding: 10mm 12mm; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(maid.fullName)} – MOM Bio-data</title>
  <style>${css}</style>
</head>
<body>
<!--MAID_PROFILE_JSON_BASE64:${importPayloadBase64}-->

<!-- ═══ AGENCY HEADER WITH LOGO ═══ -->
<div class="agency-header">
  <img class="agency-logo" src="${AGENCY_LOGO}" alt="At The Agency logo" />
</div>

<div class="page-num">A-1</div>

<div class="doc-title">BIO-DATA OF FOREIGN DOMESTIC WORKER (FDW)</div>
<div class="doc-note">*Please ensure that you run through the information within the biodata as it is an important document to help you select a suitable FDW</div>

<!-- ═══ (A) PROFILE ═══ -->
<div class="sec-label">(A) PROFILE OF FDW</div>
<div class="sub-label">A1 Personal Information</div>

<div class="profile-hero">
  <div class="fields">
    <div class="field-row"><span class="field-num">1.</span><span class="field-label">Name:</span><span class="field-value">${esc(maid.fullName)}</span></div>
    <div class="field-row"><span class="field-num">2.</span><span class="field-label">Date of birth:</span><span class="field-value" style="max-width:130px;">${esc(fmtDate(maid.dateOfBirth))}</span><span style="margin:0 8px;">Age:</span><span class="field-value" style="max-width:45px;">${age ?? ""}</span></div>
    <div class="field-row"><span class="field-num">3.</span><span class="field-label">Place of birth:</span><span class="field-value">${esc(maid.placeOfBirth ?? "")}</span></div>
    <div class="field-row"><span class="field-num">4.</span><span class="field-label">Height &amp; weight:</span><span class="field-value" style="max-width:65px;">${esc(String(maid.height ?? ""))}</span><span style="margin:0 4px;">cm</span><span class="field-value" style="max-width:65px;">${esc(String(maid.weight ?? ""))}</span><span style="margin-left:4px;">kg</span></div>
    <div class="field-row"><span class="field-num">5.</span><span class="field-label">Nationality:</span><span class="field-value">${esc((maid.nationality ?? "").replace(/\s*maid$/i, ""))}</span></div>
    <div class="field-row"><span class="field-num">6.</span><span class="field-label">Residential address in home country:</span><span class="field-value">${esc(maid.homeAddress ?? "")}</span></div>
    <div class="field-row"><span class="field-num">7.</span><span class="field-label">Name of port / airport to be repatriated to:</span><span class="field-value">${esc(maid.airportRepatriation ?? "")}</span></div>
    <div class="field-row"><span class="field-num">8.</span><span class="field-label">Contact number in home country:</span><span class="field-value">${esc(String(agencyContact.phone ?? ""))}</span></div>
    <div class="field-row"><span class="field-num">9.</span><span class="field-label">Religion:</span><span class="field-value">${esc(maid.religion ?? "")}</span></div>
    <div class="field-row"><span class="field-num">10.</span><span class="field-label">Education level:</span><span class="field-value">${esc(maid.educationLevel ?? "")}</span></div>
    <div class="field-row"><span class="field-num">11.</span><span class="field-label">Number of siblings:</span><span class="field-value">${esc(String(maid.numberOfSiblings ?? ""))}</span></div>
    <div class="field-row"><span class="field-num">12.</span><span class="field-label">Marital status:</span><span class="field-value">${esc(maid.maritalStatus ?? "")}</span></div>
    <div class="field-row"><span class="field-num">13.</span><span class="field-label">Number of children:</span><span class="field-value">${esc(String(maid.numberOfChildren ?? ""))}</span></div>
    <div class="field-row"><span class="field-num">&nbsp;</span><span class="field-label">– Age(s) of children (if any):</span><span class="field-value">${esc(String(introduction.agesOfChildren ?? ""))}</span></div>
  </div>
  <div class="photo-box">
    <img src="${photoSrc}" alt="${esc(maid.fullName)}" />
  </div>
</div>

<!-- ── A2 Medical ── -->
<div class="sub-label" style="margin-top:12px;">A2 Medical History/Dietary Restrictions</div>
<div class="field-row"><span class="field-num">14.</span><span class="field-label">Allergies (if any):</span><span class="field-value">${esc(String(introduction.allergies ?? ""))}</span></div>
<div class="field-row" style="margin-bottom:4px;"><span class="field-num">15.</span><span>Past and existing illnesses (including chronic ailments and illnesses requiring medication):</span></div>

<table class="illness">
  <thead>
    <tr>
      <td class="ill-label"></td>
      <td class="ill-box-header">Yes</td>
      <td class="ill-box-header">No</td>
      <td class="ill-spacer"></td>
      <td class="ill-label"></td>
      <td class="ill-box-header">Yes</td>
      <td class="ill-box-header">No</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="ill-label">i.&nbsp; Mental illness</td>
      <td class="ill-box">${pastIllnesses["mentalIllness"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["mentalIllness"] ? "&#10003;" : ""}</td>
      <td class="ill-spacer"></td>
      <td class="ill-label">vi.&nbsp; Tuberculosis</td>
      <td class="ill-box">${pastIllnesses["tuberculosis"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["tuberculosis"] ? "&#10003;" : ""}</td>
    </tr>
    <tr>
      <td class="ill-label">ii.&nbsp; Epilepsy</td>
      <td class="ill-box">${pastIllnesses["epilepsy"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["epilepsy"] ? "&#10003;" : ""}</td>
      <td class="ill-spacer"></td>
      <td class="ill-label">vii.&nbsp; Heart disease</td>
      <td class="ill-box">${pastIllnesses["heartDisease"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["heartDisease"] ? "&#10003;" : ""}</td>
    </tr>
    <tr>
      <td class="ill-label">iii.&nbsp; Asthma</td>
      <td class="ill-box">${pastIllnesses["asthma"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["asthma"] ? "&#10003;" : ""}</td>
      <td class="ill-spacer"></td>
      <td class="ill-label">viii.&nbsp; Malaria</td>
      <td class="ill-box">${pastIllnesses["malaria"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["malaria"] ? "&#10003;" : ""}</td>
    </tr>
    <tr>
      <td class="ill-label">iv.&nbsp; Diabetes</td>
      <td class="ill-box">${pastIllnesses["diabetes"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["diabetes"] ? "&#10003;" : ""}</td>
      <td class="ill-spacer"></td>
      <td class="ill-label">ix.&nbsp; Operations</td>
      <td class="ill-box">${pastIllnesses["operations"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["operations"] ? "&#10003;" : ""}</td>
    </tr>
    <tr>
      <td class="ill-label">v.&nbsp; Hypertension</td>
      <td class="ill-box">${pastIllnesses["hypertension"] ? "&#10003;" : ""}</td>
      <td class="ill-box">${!pastIllnesses["hypertension"] ? "&#10003;" : ""}</td>
      <td class="ill-spacer"></td>
      <td class="ill-label" colspan="3">x.&nbsp; Others:&nbsp;<span style="border-bottom:1px solid #555;display:inline-block;width:110px;">${esc(String(introduction.otherIllnesses ?? ""))}</span></td>
    </tr>
  </tbody>
</table>

<div class="field-row"><span class="field-num">16.</span><span class="field-label">Physical disabilities:</span><span class="field-value">${esc(String(introduction.physicalDisabilities ?? ""))}</span></div>
<div class="field-row"><span class="field-num">17.</span><span class="field-label">Dietary restrictions:</span><span class="field-value">${esc(String(introduction.dietaryRestrictions ?? ""))}</span></div>
<div class="field-row" style="align-items:center;">
  <span class="field-num">18.</span>
  <span class="field-label">Food handling preferences:</span>
  <span class="cb">${String(introduction.foodHandlingPreferences ?? "").toLowerCase().includes("pork") ? "&#10003;" : ""}</span>&nbsp;No pork&nbsp;&nbsp;
  <span class="cb">${String(introduction.foodHandlingPreferences ?? "").toLowerCase().includes("beef") ? "&#10003;" : ""}</span>&nbsp;No beef&nbsp;&nbsp;
  Others:&nbsp;<span class="field-value">${esc(String(introduction.foodHandlingPreferences ?? ""))}</span>
</div>

<!-- ── A3 Others ── -->
<div class="sub-label" style="margin-top:10px;">A3 Others</div>
<div class="field-row">
  <span class="field-num">19.</span>
  <span>Preference for rest day:&nbsp;<span style="border-bottom:1px solid #555;display:inline-block;min-width:40px;text-align:center;">${esc(String(skillsPref.offDaysPerMonth ?? ""))}</span>&nbsp;rest day(s) per month.</span>
</div>
<div class="field-row"><span class="field-num">20.</span><span class="field-label">Any other remarks:</span><span class="field-value">${esc(String(skillsPref.availabilityRemark ?? ""))}</span></div>

<!-- ═══ PAGE BREAK ═══ -->
<div class="page-num">A-2</div>

<!-- ═══ (B) SKILLS ═══ -->
<div class="sec-label">(B) SKILLS OF FDW</div>
<div class="sub-label">B1 Method of Evaluation of Skills</div>
<p style="font-size:10pt;margin-bottom:6px;">Please indicate the method(s) used to evaluate the FDW's skills (can tick more than one):</p>
<div class="checkbox-row"><span class="cb">&#10003;</span>&nbsp;Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA</div>
<div class="checkbox-row"><span class="cb">&#10003;</span>&nbsp;Interviewed by Singapore EA</div>
<div style="padding-left:22px;">
  <div class="checkbox-row"><span class="cb">&#10003;</span>&nbsp;Interviewed via telephone/teleconference</div>
  <div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;Interviewed via videoconference</div>
  <div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;Interviewed in person</div>
  <div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;Interviewed in person and also made observation of FDW in the areas of work listed in table</div>
</div>

<table class="skills" style="margin-top:8px;">
  <thead>
    <tr>
      <th class="sn">S/No</th>
      <th>Areas of Work</th>
      <th class="center">Willingness<br/>Yes/No</th>
      <th class="center">Experience<br/>Yes/No<br/><span style="font-weight:normal;font-size:8pt;">If yes, state<br/>the no. of years</span></th>
      <th>Assessment/Observation<br/><span style="font-weight:normal;font-size:8pt;">Please state qualitative observations of FDW and/or rate the FDW<br/>(indicate N.A. if no evaluation was done) Poor……Excellent…N.A &nbsp;1 2 3 4 5 N.A</span></th>
    </tr>
  </thead>
  <tbody>${workAreaRows}</tbody>
</table>

<!-- ═══ PAGE BREAK ═══ -->
<div class="page-num">A-3</div>

<!-- ═══ (C) EMPLOYMENT ═══ -->
<div class="sec-label">(C) EMPLOYMENT HISTORY OF THE FDW</div>
<div class="sub-label">C1 Employment History Overseas</div>

<table class="emp">
  <thead>
    <tr>
      <th colspan="2">Date</th>
      <th>Country<br/>(including FDW's home country)</th>
      <th>Employer</th>
      <th>Work Duties</th>
      <th>Remarks</th>
    </tr>
    <tr>
      <th style="width:50px;">From</th>
      <th style="width:50px;">To</th>
      <th></th><th></th><th></th><th></th>
    </tr>
  </thead>
  <tbody>${empRows}</tbody>
</table>

<div class="sub-label" style="margin-top:10px;">C2 Employment History in Singapore</div>
<div class="field-row">
  <span>Previous working experience in Singapore&nbsp;&nbsp;</span>
  <span class="cb">&#10003;</span>&nbsp;Yes&nbsp;&nbsp;&nbsp;
  <span class="cb">&nbsp;</span>&nbsp;No
</div>
<p style="font-size:8.5pt;margin:4px 0 10px;">(The EA is required to obtain the FDW's employment history from MOM and furnish the employer with the employment history of the FDW. The employer may also verify the FDW's employment history in Singapore through WPOL using SingPass)</p>

<div class="sub-label">C3 Feedback from previous employers in Singapore</div>
<p style="font-size:10pt;margin-bottom:4px;">Feedback was/was not obtained by the EA from the previous employers. If feedback was obtained (attach testimonial if possible), please indicate the feedback in the table below:</p>
<table class="emp">
  <thead><tr><th style="width:90px;">&nbsp;</th><th>Feedback</th></tr></thead>
  <tbody>
    <tr><td style="padding:4px 6px;">Employer 1</td><td style="min-height:36px;">&nbsp;</td></tr>
    <tr><td style="padding:4px 6px;">Employer 2</td><td style="min-height:36px;">&nbsp;</td></tr>
  </tbody>
</table>

<div class="sec-label" style="margin-top:10px;">(D) AVAILABILITY OF FDW TO BE INTERVIEWED BY PROSPECTIVE EMPLOYER</div>
<div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;FDW is not available for interview</div>
<div class="checkbox-row"><span class="cb">&#10003;</span>&nbsp;FDW can be interviewed by phone</div>
<div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;FDW can be interviewed by video-conference</div>
<div class="checkbox-row"><span class="cb">&nbsp;</span>&nbsp;FDW can be interviewed in person</div>

<!-- ═══ PAGE BREAK ═══ -->
<div class="page-num">A-4</div>

<!-- ═══ (E) OTHER REMARKS ═══ -->
<div class="sec-label">(E) OTHER REMARKS</div>
<div class="remarks-box">${esc(remarksText)}</div>

<!-- ── Signatures ── -->
<div class="sig-grid">
  <div>
    <div class="sig-line">${esc(maid.fullName)}<br/>FDW Name and Signature</div>
    <div style="margin-top:8px;font-size:9pt;">Date:</div>
  </div>
  <div>
    <div class="sig-line">${esc(String(agencyContact.contactPerson ?? ""))}<br/>EA Personnel Name and Registration Number</div>
    <div style="margin-top:8px;font-size:9pt;">Date:</div>
  </div>
</div>

<div style="margin-top:20px;font-size:10pt;">I have gone through the page biodata of this FDW and confirm that I would like to employ her</div>
<div style="margin-top:32px;">
  <div class="sig-line">&nbsp;<br/>Employer Name and NRIC No.</div>
  <div style="margin-top:8px;font-size:9pt;">Date:</div>
</div>

<div style="text-align:center;margin:16px 0;font-size:10pt;">***************</div>

<div class="foot-title">IMPORTANT NOTES FOR EMPLOYERS WHEN USING THE SERVICES OF AN EA</div>
<div class="foot-item"><span class="foot-bullet">&#9632;</span><span>Do consider asking for an FDW who is able to communicate in a language you require, and interview her (in person/phone/videoconference) to ensure that she can communicate adequately.</span></div>
<div class="foot-item"><span class="foot-bullet">&#9632;</span><span>Do consider requesting for an FDW who has a proven ability to perform the chores you require, for example, performing household chores (especially if she is required to hang laundry from a high-rise unit), cooking and caring for young children or the elderly.</span></div>
<div class="foot-item"><span class="foot-bullet">&#9632;</span><span>Do work together with the EA to ensure that a suitable FDW is matched to you according to your needs and requirements.</span></div>
<div class="foot-item"><span class="foot-bullet">&#9632;</span><span>You may wish to pay special attention to your prospective FDW's employment history and feedback from the FDW's previous employer(s) before employing her.</span></div>

</body>
</html>`;
};

// ── Download helpers ───────────────────────────────────────────────────────
const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportMaidProfileToWord = (maid: MaidProfile) => {
  const html = buildMomBiodataHtml(maid);
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  downloadBlob(`${maid.referenceCode || maid.fullName}-bio-data.doc`, blob);
};

export const exportMaidProfileToExcel = (maid: MaidProfile) => {
  const html = buildMomBiodataHtml(maid);
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(`${maid.referenceCode || maid.fullName}-bio-data.xls`, blob);
};

// ── A4 dimensions ───────────────────────────────────────────────────────────
const A4_W_MM = 210;
const A4_H_MM = 297;
const A4_W_PX = 794; // ~96 dpi A4 width

// ── Render the MOM HTML biodata into a hidden iframe, capture with html2canvas,
//    then slice into A4 pages with jsPDF — identical to the print window layout.
const exportMaidProfileViaCanvas = async (maid: MaidProfile): Promise<boolean> => {
  try {
    const [html2canvas, JsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPdf()]);

    // Build the same HTML that the print window uses
    const html = buildMomBiodataHtml(maid);

    // Render into a hidden, A4-width iframe so layout matches print exactly
    const iframe = document.createElement("iframe");
    iframe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      `width:${A4_W_PX}px`,
      "height:1px",           // grows with content
      "border:none",
      "opacity:0",
      "pointer-events:none",
      "z-index:-1",
    ].join(";");
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) { document.body.removeChild(iframe); return false; }

    const body = iframeDoc.body;
    // Let the iframe expand to its natural height
    iframe.style.height = `${body.scrollHeight}px`;

    // Wait one frame for layout to settle
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: A4_W_PX,
      windowWidth: A4_W_PX,
    });

    document.body.removeChild(iframe);

    // ── Slice canvas into A4 pages ────────────────────────────────────────
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // canvas is 2× scale, so logical px = canvas px / 2
    const logicalCanvasW = canvas.width / 2;
    const logicalCanvasH = canvas.height / 2;

    // How many logical px fit in one A4 page height (preserving aspect ratio of A4)
    const pxPerMm = logicalCanvasW / A4_W_MM;
    const pageHeightPx = A4_H_MM * pxPerMm;           // logical px per page
    const totalPages = Math.ceil(logicalCanvasH / pageHeightPx);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();

      const srcY = i * pageHeightPx;
      const srcH = Math.min(pageHeightPx, logicalCanvasH - srcY);

      // Slice out this page's rows from the full canvas (at 2× scale)
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;                // full 2× width
      sliceCanvas.height = Math.round(srcH * 2);      // 2× scale

      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, Math.round(srcY * 2),           // source x, y (2× coords)
          canvas.width, Math.round(srcH * 2), // source w, h
          0, 0,                               // dest x, y
          sliceCanvas.width, sliceCanvas.height,
        );
      }

      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
      // Fill the full A4 page — height proportional to how much content is on this slice
      const destH = (srcH / pageHeightPx) * A4_H_MM;
      pdf.addImage(sliceData, "JPEG", 0, 0, A4_W_MM, destH);
    }

    pdf.setProperties({
      title: `${maid.fullName || maid.referenceCode} Bio-data`,
      subject: `MAID_PROFILE_JSON_BASE64:${encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)))}`,
      creator: "Helped Maid Portal",
    });
    pdf.save(`${maid.referenceCode || maid.fullName}-bio-data.pdf`);
    return true;
  } catch {
    return false;
  }
};

export const exportMaidProfileToPdf = async (maid: MaidProfile) => {
  // Primary: render the MOM HTML biodata via canvas → jsPDF (same layout as print)
  const canvasOk = await exportMaidProfileViaCanvas(maid);
  if (canvasOk) return;

  // Fallback: pdf-lib text export + HTML print window (original behaviour)
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${maid.fullName || maid.referenceCode} Bio-data`);
  pdf.setSubject(`MAID_PROFILE_JSON_BASE64:${encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)))}`);
  pdf.setCreator("Helped Maid Portal");
  pdf.setProducer("Helped Maid Portal");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  const lineHeight = 15;
  const maxWidth = pageSize[0] - margin * 2;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => {
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
  };

  const drawWrapped = (text: string, size = 10, bold = false, color = rgb(0.12, 0.14, 0.18)) => {
    const activeFont = bold ? boldFont : font;
    const words = normalizeText(text).split(" ").filter(Boolean);
    let line = "";

    const commit = (value: string) => {
      if (y < margin + lineHeight) newPage();
      page.drawText(value, { x: margin, y, size, font: activeFont, color });
      y -= lineHeight;
    };

    if (words.length === 0) {
      commit("-");
      return;
    }

    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (activeFont.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
        return;
      }
      if (line) commit(line);
      line = word;
    });

    if (line) commit(line);
  };

  page.drawText("Maid Bio-data", {
    x: margin,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.07, 0.38, 0.3),
  });
  y -= 28;
  page.drawText(`Generated ${new Date().toLocaleDateString("en-SG")}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.44, 0.5),
  });
  y -= 22;

  const primaryPhoto = getPrimaryPhoto(maid);
  if (primaryPhoto) {
    try {
      const { bytes, mimeType } = dataUrlToBytes(primaryPhoto);
      const image = mimeType.includes("png")
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const scaled = image.scale(0.28);
      page.drawImage(image, {
        x: pageSize[0] - margin - scaled.width,
        y: pageSize[1] - margin - scaled.height,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // Ignore photo embedding failures and continue with text export.
    }
  }

  getSectionRows(maid).forEach((section) => {
    if (y < margin + 80) newPage();
    page.drawText(section.title, {
      x: margin,
      y,
      size: 13,
      font: boldFont,
      color: rgb(0.07, 0.38, 0.3),
    });
    y -= 18;

    section.rows.forEach(([label, value]) => {
      drawWrapped(`${label}: ${normalizeText(value) || "N/A"}`, 10, false);
    });

    y -= 8;
  });

  const bytes = await pdf.save({ useObjectStreams: false });
  downloadBytes(`${maid.referenceCode || maid.fullName}-bio-data.pdf`, bytes, "application/pdf");

  // Also open the fully-styled HTML layout in a print window so the user
  // can additionally save a design-accurate PDF via the browser print dialog.
  const html = buildMomBiodataHtml(maid);
  const printStyle = `
    <style>
      @page { size: A4; margin: 10mm 12mm; }
      @media print {
        body { padding: 0 !important; }
        .page-num { page-break-before: always; padding-top: 4mm; }
        .page-num:first-of-type { page-break-before: avoid; }
      }
    </style>
  `;
  const htmlWithPrint = html.replace("</head>", `${printStyle}</head>`);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const cleanup = () => setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 3000);

  iframe.onload = () => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) { cleanup(); return; }
      iframeDoc.open();
      iframeDoc.write(htmlWithPrint);
      iframeDoc.close();

      const images = Array.from(iframeDoc.images);
      Promise.all(
        images.map(
          (img) => new Promise<void>((res) => {
            if (img.complete) { res(); return; }
            img.onload = () => res();
            img.onerror = () => res();
          })
        )
      ).then(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        cleanup();
      });
    } catch {
      cleanup();
    }
  };

  iframe.src = "about:blank";
};

export const exportMaidProfilesToPdf = async (maids: MaidProfile[]) => {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle("Maids Export");
  pdf.setSubject(`MAIDS_CSV_BASE64:${encodeBase64Utf8(buildMaidsCsv(maids))}`);
  pdf.setCreator("Helped Maid Portal");
  pdf.setProducer("Helped Maid Portal");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  const rowHeight = 18;
  const columns = [
    { label: "Reference", width: 90 },
    { label: "Name", width: 160 },
    { label: "Nationality", width: 100 },
    { label: "Type", width: 88 },
    { label: "Status", width: 65 },
    { label: "Public", width: 50 },
  ];

  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawHeader = () => {
    page.drawText("Maids PDF Export", {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.07, 0.38, 0.3),
    });
    y -= 22;
    page.drawText(`Total records: ${maids.length}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.44, 0.5),
    });
    y -= 18;

    let x = margin;
    columns.forEach((column) => {
      page.drawText(column.label, {
        x,
        y,
        size: 9,
        font: boldFont,
        color: rgb(0.12, 0.14, 0.18),
      });
      x += column.width;
    });
    y -= 12;
  };

  const newPage = () => {
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
    drawHeader();
  };

  const fit = (value: string, width: number) => {
    const text = normalizeText(value);
    if (font.widthOfTextAtSize(text, 8) <= width) return text;
    let trimmed = text;
    while (trimmed.length > 1 && font.widthOfTextAtSize(`${trimmed}...`, 8) > width) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}...`;
  };

  drawHeader();

  maids.forEach((maid) => {
    if (y < margin + rowHeight) newPage();
    let x = margin;
    const values = [
      maid.referenceCode,
      maid.fullName,
      maid.nationality,
      maid.type,
      maid.status || "available",
      maid.isPublic ? "Yes" : "No",
    ];
    values.forEach((value, index) => {
      page.drawText(fit(String(value ?? ""), columns[index].width - 6), {
        x,
        y,
        size: 8,
        font,
        color: rgb(0.12, 0.14, 0.18),
      });
      x += columns[index].width;
    });
    y -= rowHeight;
  });

  const bytes = await pdf.save({ useObjectStreams: false });
  downloadBytes(`maids-${new Date().toISOString().slice(0, 10)}.pdf`, bytes, "application/pdf");
};