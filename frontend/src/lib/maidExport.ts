import { MaidProfile } from "@/lib/maids";

let pdfLibLoader: Promise<typeof import("pdf-lib")> | null = null;

const loadPdfLib = async () => {
  pdfLibLoader ??= import("pdf-lib");
  return await pdfLibLoader;
};

// ── html2canvas + jsPDF loaders (lazy, fully typed) ────────────────────────
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

  const photoSrc = photos[1] || photos[0] || "";

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
    .agency-header { margin-bottom: 8px; }
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

    /* ── Page break sections ── */
    .page-break {
      display: block;
      text-align: right;
      font-size: 9pt;
      padding-top: 10mm;
      margin-bottom: 4px;
    }
    /* First page-break label needs no top padding */
    .page-break:first-of-type {
      padding-top: 0;
    }

    @media print {
      body { padding: 10mm 12mm; }
      .page-break {
        page-break-before: always;
        break-before: page;
        padding-top: 0;
      }
      .page-break:first-of-type {
        page-break-before: avoid;
        break-before: avoid;
      }
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
  <img class="agency-logo" src="/FM_logo.png" alt="At The Agency logo" />
</div>

<div class="page-break">A-1</div>

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
    ${photoSrc
      ? `<img src="${photoSrc}" alt="${esc(maid.fullName)}" />`
      : `<div class="no-photo">No Photo</div>`}
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

<!-- ═══ PAGE BREAK → A-2 ═══ -->
<div class="page-break">A-2</div>

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

<!-- ═══ PAGE BREAK → A-3 ═══ -->
<div class="page-break">A-3</div>

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

<!-- ═══ PAGE BREAK → A-4 ═══ -->
<div class="page-break">A-4</div>

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
//    then slice into A4 pages using .page-break element positions as boundaries.
const exportMaidProfileViaCanvas = async (maid: MaidProfile): Promise<boolean> => {
  try {
    const [html2canvas, JsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPdf()]);

    const html = buildMomBiodataHtml(maid);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      `width:${A4_W_PX}px`,
      "height:1px",
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
    iframe.style.height = `${body.scrollHeight + 200}px`;

    // Wait for all images (logo + profile photo) to fully load
    const images = Array.from(iframeDoc.images);
    await Promise.all(
      images.map(
        (img) => new Promise<void>((res) => {
          if (img.complete) { res(); return; }
          img.onload = () => res();
          img.onerror = () => res();
        })
      )
    );

    // Allow fonts + layout to fully settle
    await new Promise<void>((r) => setTimeout(r, 400));

    // Re-measure height after images load (they may have changed layout)
    iframe.style.height = `${body.scrollHeight + 200}px`;
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // ── Find .page-break elements to determine per-page slice boundaries ──
    const pageBreakEls = Array.from(
      iframeDoc.querySelectorAll<HTMLElement>(".page-break")
    );

    const totalH = body.scrollHeight;
    const sections: Array<{ top: number; bottom: number }> = [];

    pageBreakEls.forEach((el, idx) => {
      const top = el.offsetTop;
      const nextEl = pageBreakEls[idx + 1];
      const bottom = nextEl ? nextEl.offsetTop : totalH;
      sections.push({ top, bottom });
    });

    // Fallback: treat entire body as one page if no markers found
    if (sections.length === 0) {
      sections.push({ top: 0, bottom: totalH });
    }

    // Capture the full body canvas at 2× scale
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

    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Logical px → mm ratio (canvas is 2× so divide canvas.width by 2)
    const pxPerMm = (canvas.width / 2) / A4_W_MM;

    sections.forEach((section, idx) => {
      if (idx > 0) pdf.addPage();

      const srcY  = section.top;
      const srcH  = section.bottom - section.top;
      const clampedSrcH = Math.min(srcH, (canvas.height / 2) - srcY);
      if (clampedSrcH <= 0) return;

      // Slice this page's rows out of the full 2× canvas
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = Math.round(clampedSrcH * 2);

      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, Math.round(srcY * 2),
          canvas.width, Math.round(clampedSrcH * 2),
          0, 0,
          sliceCanvas.width, sliceCanvas.height,
        );
      }

      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);

      // Scale content to fit A4 width; cap height at A4 page height
      const destH = Math.min((clampedSrcH / pxPerMm), A4_H_MM);
      pdf.addImage(sliceData, "JPEG", 0, 0, A4_W_MM, destH);
    });

    pdf.setProperties({
      title: `${maid.fullName || maid.referenceCode} Bio-data`,
      subject: `MAID_PROFILE_JSON_BASE64:${encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)))}`,
      creator: "Helped Maid Portal",
    });
    pdf.save(`${maid.referenceCode || maid.fullName}-bio-data.pdf`);
    return true;
  } catch (err) {
    console.error("Canvas PDF export failed:", err);
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

  // Also open the fully-styled HTML layout in a print window
  const html = buildMomBiodataHtml(maid);
  const printStyle = `
    <style>
      @page { size: A4; margin: 10mm 12mm; }
      @media print {
        body { padding: 0 !important; }
        .page-break {
          page-break-before: always;
          break-before: page;
          padding-top: 0;
        }
        .page-break:first-of-type {
          page-break-before: avoid;
          break-before: avoid;
        }
      }
    </style>
  `;
  const htmlWithPrint = html.replace("</head>", `${printStyle}</head>`);

  const printIframe = document.createElement("iframe");
  printIframe.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;opacity:0;pointer-events:none;";
  document.body.appendChild(printIframe);

  const cleanup = () => setTimeout(() => { if (printIframe.parentNode) document.body.removeChild(printIframe); }, 3000);

  printIframe.onload = () => {
    try {
      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!iframeDoc) { cleanup(); return; }
      iframeDoc.open();
      iframeDoc.write(htmlWithPrint);
      iframeDoc.close();

      const iframeImages = Array.from(iframeDoc.images);
      Promise.all(
        iframeImages.map(
          (img) => new Promise<void>((res) => {
            if (img.complete) { res(); return; }
            img.onload = () => res();
            img.onerror = () => res();
          })
        )
      ).then(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        cleanup();
      });
    } catch {
      cleanup();
    }
  };

  printIframe.src = "about:blank";
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