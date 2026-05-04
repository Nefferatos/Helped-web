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
  if (!v) return "";
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

const buildImportPayloadWithPhoto = (maid: MaidProfile) => {
  const { id, createdAt, updatedAt, videoDataUrl, ...rest } = maid;
  return { ...rest, videoDataUrl: "" } satisfies MaidProfile;
};

const buildMaidsCsv = (maids: MaidProfile[]) => {
  const columns = [
    "referenceCode", "fullName", "type", "nationality", "dateOfBirth",
    "placeOfBirth", "height", "weight", "religion", "maritalStatus",
    "numberOfChildren", "numberOfSiblings", "homeAddress", "airportRepatriation",
    "educationLevel", "isPublic", "hasPhoto",
  ] as const;
  const rows = maids.map((maid) => columns.map((col) => toCsvCell(maid[col])).join(","));
  return [columns.join(","), ...rows].join("\n");
};

const normalizeText = (value: unknown) =>
  String(value ?? "").replace(/\s+/g, " ").trim();

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
        ["Reference Code", maid.referenceCode], ["Full Name", maid.fullName],
        ["Status", maid.status || "available"], ["Type", maid.type],
        ["Nationality", maid.nationality], ["Date of Birth", fmtDate(maid.dateOfBirth)],
        ["Age", age === null ? "N/A" : `${age}`], ["Place of Birth", maid.placeOfBirth],
        ["Religion", maid.religion], ["Marital Status", maid.maritalStatus],
        ["Children", maid.numberOfChildren], ["Siblings", maid.numberOfSiblings],
        ["Height / Weight", `${maid.height ?? ""} cm / ${maid.weight ?? ""} kg`],
        ["Education", maid.educationLevel],
      ],
    },
    {
      title: "Contact & Availability",
      rows: [
        ["Home Address", maid.homeAddress], ["Repatriation Airport", maid.airportRepatriation],
        ["Agency Contact", agencyContact.contactPerson], ["Agency Phone", agencyContact.phone],
        ["Passport No", agencyContact.passportNo], ["Rest Days / Month", skills.offDaysPerMonth],
        ["Interview Options", Array.isArray(skills.availabilityInterviewOptions) ? (skills.availabilityInterviewOptions as string[]).join(", ") : ""],
        ["Availability Remark", skills.availabilityRemark],
      ],
    },
    {
      title: "Skills & Introduction",
      rows: [
        ["Languages", Object.entries(maid.languageSkills || {}).map(([n, l]) => `${n}: ${l}`).join(", ")],
        ["Work Areas", Object.entries(workAreas).filter(([, v]) => Boolean(v)).map(([n]) => n).join(", ")],
        ["Public Intro", intro.publicIntro], ["Private Intro", intro.intro],
        ["Food Handling", intro.foodHandlingPreferences], ["Dietary Restrictions", intro.dietaryRestrictions],
        ["Allergies", intro.allergies], ["Physical Disabilities", intro.physicalDisabilities],
      ],
    },
    {
      title: "Employment History",
      rows: employment.length > 0
        ? employment.map((entry, i) => {
            const row = entry as Record<string, unknown>;
            return [`Employer ${i + 1}`, [row.from, row.to].filter(Boolean).join(" - ") + " | " + [row.country, row.employer, row.duties, row.remarks].filter(Boolean).join(" | ")];
          })
        : [["History", "No employment history recorded"]],
    },
  ];
};

const downloadBytes = (filename: string, bytes: Uint8Array, mimeType: string) => {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  downloadBlob(filename, blob);
};

// =============================================================================
// buildMomBiodataHtml
// Pages A-1 … A-4 (+ optional A-5 if remarks overflow).
// .page-separator divs are ZERO-HEIGHT so the canvas slicer produces no gaps.
// =============================================================================
const buildMomBiodataHtml = (maid: MaidProfile): string => {
  const agencyContact = (maid.agencyContact ?? {}) as Record<string, unknown>;
  const introduction  = (maid.introduction  ?? {}) as Record<string, unknown>;
  const skillsPref    = (maid.skillsPreferences ?? {}) as Record<string, unknown>;
  const pastIllnesses = ((introduction.pastIllnesses ?? {}) as Record<string, boolean>);
  const workAreas     = Object.entries(maid.workAreas ?? {}) as Array<
    [string, { willing?: boolean; experience?: boolean; evaluation?: string; yearsOfExperience?: string; assessmentText?: string; notes?: string }]
  >;
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];

  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl ? [maid.photoDataUrl] : [];
  const photoSrc = photos[1] || photos[0] || "";

  const age = calcAge(maid.dateOfBirth);
  const importPayloadBase64 = encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)));

  // ── small helpers ─────────────────────────────────────────────────────────
  const cb = (checked: boolean) =>
    `<span class="cb">${checked ? "&#x2611;" : "&#x2610;"}</span>`;

  const ibox = (yes: boolean) =>
    `<td class="ibox">${yes ? "&#10003;" : ""}</td>`;

  const ill = (key: string) => pastIllnesses[key] === true;

  const interviewOpts: string[] = Array.isArray(skillsPref.availabilityInterviewOptions)
    ? (skillsPref.availabilityInterviewOptions as string[])
    : [];
  const hasOpt = (s: string) => interviewOpts.some(o => o.toLowerCase().includes(s));

  // ── DOB digit boxes ───────────────────────────────────────────────────────
  const dobParts = maid.dateOfBirth ? new Date(maid.dateOfBirth) : null;
  const dobDD  = dobParts ? String(dobParts.getDate()).padStart(2, "0") : "  ";
  const dobMM  = dobParts ? String(dobParts.getMonth() + 1).padStart(2, "0") : "  ";
  const dobYY  = dobParts ? String(dobParts.getFullYear()).slice(-2) : "  ";
  const ageStr = age !== null ? String(age).padStart(2, "0") : "  ";

  const dobBoxes = `<div class="digit-row">
    <div class="dbox">${dobDD[0]}</div><div class="dbox">${dobDD[1]}</div>
    <div class="dsep"></div>
    <div class="dbox">${dobMM[0]}</div><div class="dbox">${dobMM[1]}</div>
    <div class="dsep"></div>
    <div class="dbox">${dobYY[0]}</div><div class="dbox">${dobYY[1]}</div>
    <span style="margin:0 6px;">Age:</span>
    <div class="dbox">${ageStr[0]}</div><div class="dbox">${ageStr[1]}</div>
  </div>`;

  // ── Height/weight digit boxes ─────────────────────────────────────────────
  const hRaw = String(maid.height ?? "").padStart(3, " ");
  const wRaw = String(maid.weight ?? "").padStart(2, " ");
  const hwBoxes = `<div class="digit-row">
    <div class="dbox">${hRaw[0].trim() || "&nbsp;"}</div>
    <div class="dbox">${hRaw[1].trim() || "&nbsp;"}</div>
    <div class="dbox">${hRaw[2].trim() || "&nbsp;"}</div>
    <span style="margin:0 4px;">cm</span>
    <div class="dbox">${wRaw[0].trim() || "&nbsp;"}</div>
    <div class="dbox">${wRaw[1].trim() || "&nbsp;"}</div>
    <span style="margin-left:4px;">kg</span>
  </div>`;

  // ── MOM standard skill areas ──────────────────────────────────────────────
  const MOM_AREAS = [
    { label: "Care of infants/children", sub: "Please specify age range:" },
    { label: "Care of elderly",          sub: null },
    { label: "Care of disabled",         sub: null },
    { label: "General housework",        sub: null },
    { label: "Cooking",                  sub: "Please specify cuisines:" },
    { label: "Language abilities (spoken)", sub: "Please specify:" },
    { label: "Other skills, if any",     sub: "Please specify:" },
  ];

  const areaByIdx = new Map<number, typeof workAreas[0][1]>();
  workAreas.forEach(([key, cfg]) => {
    const kl = key.toLowerCase();
    const idx = MOM_AREAS.findIndex(a => {
      const al = a.label.toLowerCase();
      return al.startsWith(kl.split(" ")[0]) || kl.includes(al.split(" ")[0]);
    });
    if (idx >= 0) areaByIdx.set(idx, cfg);
  });

  const skillRows = MOM_AREAS.map(({ label, sub }, idx) => {
    const cfg = areaByIdx.get(idx);
    const assess = cfg
      ? cfg.assessmentText
        ? esc(String(cfg.assessmentText))
        : cfg.evaluation ? `Rate: ${esc(cfg.evaluation)}` : "N.A"
      : "N.A";
    const notes = cfg ? esc(String(cfg.notes ?? "")) : "";
    return `<tr>
      <td class="sn">${idx + 1}.</td>
      <td class="area-col">${esc(label)}${sub
        ? `<br/><span class="sub-note">${esc(sub)}</span> <span class="sub-val">${notes}&nbsp;</span>`
        : ""}</td>
      <td class="tctr">${cfg ? esc(yesNo(cfg.willing ?? false)) : ""}</td>
      <td class="tctr">${cfg ? esc(yesNo(cfg.experience ?? false)) : ""}${
        cfg?.experience && cfg.yearsOfExperience
          ? `<br/><span style="font-size:7pt;">${esc(cfg.yearsOfExperience)} yr</span>` : ""}</td>
      <td class="assess-col">${assess}</td>
    </tr>`;
  }).join("");

  // ── Employment rows ───────────────────────────────────────────────────────
  const empRows = (employment as Record<string, string>[]).length > 0
    ? (employment as Record<string, string>[]).map(e => `<tr>
        <td class="emp-date">${esc(e.from ?? "")}</td>
        <td class="emp-date">${esc(e.to   ?? "")}</td>
        <td>${esc(e.country  ?? "")}</td>
        <td>${esc(e.employer ?? "")}</td>
        <td>${esc(e.duties   ?? "")}</td>
        <td>${esc(e.remarks  ?? "")}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="height:28px;"></td></tr>
       <tr><td colspan="6" style="height:28px;"></td></tr>`;

  // ── Remarks (de-duplicated) ───────────────────────────────────────────────
  const pub   = String(introduction.publicIntro  ?? "").trim();
  const priv  = String(introduction.intro        ?? "").trim();
  const other = String(introduction.otherRemarks ?? "").trim();
  let remarksText = "";
  if (pub && priv && pub !== priv) remarksText = `${pub}\n\n${priv}`;
  else if (pub)  remarksText = pub;
  else if (priv) remarksText = priv;
  if (other && other !== remarksText) remarksText = remarksText ? `${remarksText}\n\n${other}` : other;

  const remarksOverflows = remarksText.length > 800;

  // ── Agency details ────────────────────────────────────────────────────────
  const agencyName    = esc(String(agencyContact.agencyName    ?? "At The Agency (formerly Rinzin Agency Pte. Ltd) (MOM Lic No. 25C3114)"));
  const agencyAddress = esc(String(agencyContact.agencyAddress ?? "3 Jalan Kukoh, #01-115. Singapore 161003"));
  const agencyTel     = esc(String(agencyContact.agencyPhone   ?? agencyContact.phone ?? ""));

  // Repeated on every page
  const HDR = `<div class="agency-header">
    <img class="agency-logo" src="/FM_logo.png" alt="Agency Logo" onerror="this.style.display='none'" />
    <div class="agency-info">
      <div class="agency-name">${agencyName}</div>
      <div>${agencyAddress}</div>
      <div>Tel: ${agencyTel}</div>
    </div>
  </div>`;


  const sigBlock = `
  <div class="sig-grid">
    <div>
      <div class="sig-line">${esc(maid.fullName)}<br/>FDW Name and Signature</div>
      <div style="margin-top:6px;font-size:8pt;">Date:</div>
    </div>
    <div>
      <div class="sig-line">${esc(String(agencyContact.contactPerson ?? ""))}<br/>EA Personnel Name and Registration Number</div>
      <div style="margin-top:6px;font-size:8pt;">Date:</div>
    </div>
  </div>
  <p style="margin-top:12px;font-size:8.5pt;">I have gone through the biodata of this FDW and confirm that I would like to employ her</p>
  <div style="margin-top:22px;">
    <div class="sig-line">&nbsp;<br/>Employer Name and NRIC No.</div>
    <div style="margin-top:6px;font-size:8pt;">Date:</div>
  </div>
  <div style="text-align:center;margin:10px 0;font-size:9pt;">***************</div>
  <div class="foot-title">IMPORTANT NOTES FOR EMPLOYERS WHEN USING THE SERVICES OF AN EA</div>
  <div class="foot-item"><span class="foot-bul">&#9632;</span><span>Do consider asking for an FDW who is able to communicate in a language you require, and interview her (in person/phone/videoconference) to ensure that she can communicate adequately.</span></div>
  <div class="foot-item"><span class="foot-bul">&#9632;</span><span>Do consider requesting for an FDW who has a proven ability to perform the chores you require, for example, performing household chores (especially if she is required to hang laundry from a high-rise unit), cooking and caring for young children or the elderly.</span></div>
  <div class="foot-item"><span class="foot-bul">&#9632;</span><span>Do work together with the EA to ensure that a suitable FDW is matched to you according to your needs and requirements.</span></div>
  <div class="foot-item"><span class="foot-bul">&#9632;</span><span>You may wish to pay special attention to your prospective FDW's employment history and feedback from the FDW's previous employer(s) before employing her.</span></div>`;

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; background: #fff; line-height: 1.38; }

    /* ZERO-HEIGHT page separator — invisible slice marker for canvas export */
    .page-separator { display: block; width: 100%; height: 0; overflow: hidden; font-size: 0; line-height: 0; padding: 0; margin: 0; border: none; }

    .page { padding: 6px 13mm 8px; }
    .page-ref { text-align: center; font-weight: bold; font-size: 9pt; margin: 4px 0; }

    .agency-header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #000; padding: 7px 13mm; }
    .agency-logo { height: 56px; width: auto; flex-shrink: 0; }
    .agency-info { font-size: 8.5pt; line-height: 1.5; }
    .agency-name { font-weight: bold; font-size: 10pt; }

    .doc-title { text-align: center; font-weight: bold; font-size: 11pt; margin-bottom: 2px; }
    .doc-note  { font-size: 7.5pt; font-style: italic; margin-bottom: 6px; }

    .sec-label { font-weight: bold; font-size: 9.5pt; text-decoration: underline; margin: 6px 0 3px; }
    .sub-label { font-weight: bold; font-size: 9pt; margin: 4px 0 3px; }
    .sub-note  { font-style: italic; font-size: 7.5pt; color: #333; }
    .sub-val   { font-size: 8pt; border-bottom: 1px solid #555; display: inline-block; min-width: 70px; }

    .profile-hero { display: grid; grid-template-columns: 1fr 190px; gap: 10px; align-items: start; }

    .photo-block { display: flex; flex-direction: column; }
    .ref-block { border: 1px solid #888; border-bottom: none; padding: 5px 7px; font-size: 9pt; font-weight: bold; line-height: 1.5; }
    .ref-code { font-size: 10.5pt; }
    .photo-img { width: 190px; height: 242px; object-fit: cover; object-position: top center; display: block; border: 1px solid #888; }
    .photo-placeholder { width: 190px; height: 242px; border: 1px solid #888; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #888; background: #f8f8f8; text-align: center; line-height: 1.6; }

    .field-row { display: flex; align-items: baseline; margin-bottom: 3px; font-size: 8.5pt; gap: 2px; }
    .fn { min-width: 20px; flex-shrink: 0; }
    .fl { white-space: nowrap; flex-shrink: 0; min-width: 202px; }
    .fl-auto { white-space: nowrap; flex-shrink: 0; }
    .fv { border-bottom: 1px solid #555; flex: 1; min-width: 40px; min-height: 13px; font-size: 8.5pt; word-break: break-word; padding-bottom: 1px; }
    .fv-sm { border-bottom: 1px solid #555; display: inline-block; min-width: 55px; min-height: 13px; font-size: 8.5pt; padding-bottom: 1px; }

    .digit-row { display: inline-flex; align-items: center; gap: 1px; font-size: 8.5pt; }
    .dbox { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 16px; border: 1px solid #666; font-size: 8pt; font-weight: bold; }
    .dsep { width: 4px; }

    table.illness { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 3px 0; }
    table.illness td { padding: 2px 3px; vertical-align: middle; }
    .ibox { width: 22px; height: 16px; text-align: center; border: 1px solid #555; font-size: 9pt; font-weight: bold; }
    .ihdr { width: 22px; text-align: center; font-size: 8pt; font-weight: bold; }
    .igap { width: 10px; }

    table.skills { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 4px 0; table-layout: fixed; }
    table.skills th, table.skills td { border: 1px solid #666; padding: 4px 5px; vertical-align: top; word-break: break-word; }
    table.skills thead th { background: #f0f0f0; text-align: center; font-size: 8pt; font-weight: bold; }
    .sn { width: 26px; text-align: center; }
    .area-col { width: 22%; }
    .tctr { width: 54px; text-align: center; }
    .assess-col { font-size: 8pt; }

    table.emp { width: 100%; border-collapse: collapse; font-size: 8pt; margin: 4px 0; table-layout: fixed; }
    table.emp th, table.emp td { border: 1px solid #666; padding: 4px 5px; vertical-align: top; word-break: break-word; }
    table.emp thead th { background: #f0f0f0; text-align: center; font-size: 8pt; }
    .emp-date { width: 42px; }

    .checkbox-row { display: flex; align-items: flex-start; gap: 5px; margin: 2px 0; font-size: 8.5pt; }
    .cb { font-size: 12pt; line-height: 1; flex-shrink: 0; margin-top: -2px; }
    .indent { padding-left: 20px; }

    .remarks-box { border: 1px solid #555; padding: 6px 8px; font-size: 8.5pt; white-space: pre-wrap; word-break: break-word; margin: 3px 0 8px; line-height: 1.5; }
    .remarks-short   { min-height: 110px; }
    .remarks-overflow { min-height: 50px; }

    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 8px; }
    .sig-line { border-top: 1px solid #555; margin-top: 24px; font-size: 8pt; padding-top: 2px; }

    .foot-title { font-weight: bold; text-decoration: underline; margin: 8px 0 3px; font-size: 9pt; }
    .foot-item  { display: flex; gap: 5px; margin: 3px 0; font-size: 8.5pt; line-height: 1.45; }
    .foot-bul   { min-width: 10px; flex-shrink: 0; }

    .page-footer { font-size: 7pt; color: #555; text-align: center; margin-top: 6px; border-top: 1px solid #ddd; padding-top: 3px; }

    @media print {
      .page-separator { page-break-before: always; break-before: page; }
      .agency-header { padding: 6px 0; }
      .page { padding: 4px 0 6px; }
    }
  `;

  // ── A-4 body: remarks + (optional overflow A-5) ───────────────────────────
  const pageA4body = remarksOverflows
    ? `<div class="sec-label">(E) OTHER REMARKS</div>
      <div class="remarks-box remarks-overflow">${esc(remarksText)}</div>
    </div>

    <!-- ═══ PAGE A-5 ═══ -->
    <div class="page-separator" data-page="A-5"></div>
    ${HDR}
    <div class="page">
      <div class="page-ref">A-5</div>
      ${sigBlock}
      `
    : `<div class="sec-label">(E) OTHER REMARKS</div>
      <div class="remarks-box remarks-short">${esc(remarksText)}</div>
      ${sigBlock}
      `;

  // ─────────────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(maid.fullName)} – Bio-data</title>
  <style>${css}</style>
</head>
<body>
<!--MAID_PROFILE_JSON_BASE64:${importPayloadBase64}-->

<!-- ═══════════════════ PAGE A-1 ═══════════════════ -->
<div class="page-separator" data-page="A-1"></div>
${HDR}
<div class="page">
  <div class="page-ref">A-1</div>
  <div class="doc-title">BIO-DATA OF FOREIGN DOMESTIC WORKER (FDW)</div>
  <p class="doc-note">*Please ensure that you run through the information within the biodata as it is an important document to help you select a suitable FDW</p>

  <div class="sec-label">(A) PROFILE OF FDW</div>
  <div class="sub-label">A1 Personal Information</div>

  <div class="profile-hero">
    <div>
      <div class="field-row"><span class="fn">1.</span><span class="fl-auto">Name:&nbsp;</span><span class="fv">${esc(maid.fullName)}&nbsp;</span></div>
      <div class="field-row" style="align-items:center;"><span class="fn">2.</span><span class="fl-auto">Date of birth:&nbsp;</span>${dobBoxes}</div>
      <div class="field-row"><span class="fn">3.</span><span class="fl-auto">Place of birth:&nbsp;</span><span class="fv">${esc(maid.placeOfBirth ?? "")}&nbsp;</span></div>
      <div class="field-row" style="align-items:center;"><span class="fn">4.</span><span class="fl-auto">Height &amp; weight:&nbsp;</span>${hwBoxes}</div>
      <div class="field-row"><span class="fn">5.</span><span class="fl">Nationality:</span><span class="fv">${esc((maid.nationality ?? "").replace(/\s*maid$/i, ""))}&nbsp;</span></div>
      <div class="field-row"><span class="fn">6.</span><span class="fl">Residential address in home country:</span><span class="fv">${esc(maid.homeAddress ?? "")}&nbsp;</span></div>
      <div class="field-row"><span class="fn">7.</span><span class="fl">Name of port / airport to be repatriated to:</span><span class="fv">${esc(maid.airportRepatriation ?? "")}&nbsp;</span></div>
      <div class="field-row"><span class="fn">8.</span><span class="fl">Contact number in home country:</span><span class="fv">${esc(String(agencyContact.phone ?? ""))}&nbsp;</span></div>
      <div class="field-row"><span class="fn">9.</span><span class="fl">Religion:</span><span class="fv">${esc(maid.religion ?? "")}&nbsp;</span></div>
      <div class="field-row"><span class="fn">10.</span><span class="fl">Education level:</span><span class="fv">${esc(maid.educationLevel ?? "")}&nbsp;</span></div>
      <div class="field-row"><span class="fn">11.</span><span class="fl">Number of siblings:</span><span class="fv-sm">${esc(String(maid.numberOfSiblings ?? ""))}&nbsp;</span></div>
      <div class="field-row"><span class="fn">12.</span><span class="fl">Marital status:</span><span class="fv">${esc(maid.maritalStatus ?? "")}&nbsp;</span></div>
      <div class="field-row"><span class="fn">13.</span><span class="fl">Number of children:</span><span class="fv-sm">${esc(String(maid.numberOfChildren ?? ""))}&nbsp;</span></div>
      <div class="field-row"><span class="fn">&nbsp;</span><span class="fl">– Age(s) of children (if any):</span><span class="fv">${esc(String(introduction.agesOfChildren ?? ""))}&nbsp;</span></div>
    </div>

    <div class="photo-block">
      <div class="ref-block">
        <div class="ref-code">Ref: ${esc(String(maid.referenceCode ?? ""))}</div>
        <div>${esc(String(maid.type ?? ""))}</div>
      </div>
      ${photoSrc
        ? `<img class="photo-img" src="${photoSrc}" alt="${esc(maid.fullName)}" />`
        : `<div class="photo-placeholder">PHOTO<br/>(half/full bodied<br/>and coloured)</div>`}
    </div>
  </div>

  <div class="sub-label" style="margin-top:7px;">A2 Medical History/Dietary Restrictions</div>
  <div class="field-row"><span class="fn">14.</span><span class="fl">Allergies (if any):</span><span class="fv">${esc(String(introduction.allergies ?? ""))}&nbsp;</span></div>
  <div class="field-row" style="flex-wrap:wrap;margin-bottom:2px;"><span class="fn">15.</span><span>Past and existing illnesses (including chronic ailments and illnesses requiring medication):</span></div>

  <table class="illness">
    <thead><tr>
      <td style="width:32%;"></td><td class="ihdr">Yes</td><td class="ihdr">No</td>
      <td class="igap"></td>
      <td style="width:32%;"></td><td class="ihdr">Yes</td><td class="ihdr">No</td>
    </tr></thead>
    <tbody>
      <tr><td>i.&nbsp;&nbsp;Mental illness</td>${ibox(ill("mentalIllness"))}${ibox(!ill("mentalIllness"))}<td class="igap"></td><td>vi.&nbsp;&nbsp;Tuberculosis</td>${ibox(ill("tuberculosis"))}${ibox(!ill("tuberculosis"))}</tr>
      <tr><td>ii.&nbsp;&nbsp;Epilepsy</td>${ibox(ill("epilepsy"))}${ibox(!ill("epilepsy"))}<td class="igap"></td><td>vii.&nbsp;&nbsp;Heart disease</td>${ibox(ill("heartDisease"))}${ibox(!ill("heartDisease"))}</tr>
      <tr><td>iii.&nbsp;&nbsp;Asthma</td>${ibox(ill("asthma"))}${ibox(!ill("asthma"))}<td class="igap"></td><td>viii.&nbsp;&nbsp;Malaria</td>${ibox(ill("malaria"))}${ibox(!ill("malaria"))}</tr>
      <tr><td>iv.&nbsp;&nbsp;Diabetes</td>${ibox(ill("diabetes"))}${ibox(!ill("diabetes"))}<td class="igap"></td><td>ix.&nbsp;&nbsp;Operations</td>${ibox(ill("operations"))}${ibox(!ill("operations"))}</tr>
      <tr><td>v.&nbsp;&nbsp;Hypertension</td>${ibox(ill("hypertension"))}${ibox(!ill("hypertension"))}<td class="igap"></td><td colspan="3">x.&nbsp;&nbsp;Others:&nbsp;<span class="fv-sm" style="min-width:90px;">${esc(String(introduction.otherIllnesses ?? ""))}&nbsp;</span></td></tr>
    </tbody>
  </table>

  <div class="field-row"><span class="fn">16.</span><span class="fl">Physical disabilities:</span><span class="fv">${esc(String(introduction.physicalDisabilities ?? ""))}&nbsp;</span></div>
  <div class="field-row"><span class="fn">17.</span><span class="fl">Dietary restrictions:</span><span class="fv">${esc(String(introduction.dietaryRestrictions ?? ""))}&nbsp;</span></div>
  <div class="field-row" style="align-items:center;flex-wrap:wrap;gap:4px;">
    <span class="fn">18.</span>
    <span class="fl-auto">Food handling preferences:&nbsp;</span>
    ${cb(String(introduction.foodHandlingPreferences ?? "").toLowerCase().includes("pork"))}&nbsp;No pork&nbsp;&nbsp;
    ${cb(String(introduction.foodHandlingPreferences ?? "").toLowerCase().includes("beef"))}&nbsp;No beef&nbsp;&nbsp;
    Others:&nbsp;<span class="fv-sm" style="min-width:110px;">${esc(String(introduction.foodHandlingPreferences ?? ""))}&nbsp;</span>
  </div>

</div>


<!-- ═══════════════════ PAGE A-2 ═══════════════════ -->
<div class="page-separator" data-page="A-2"></div>
${HDR}
<div class="page">
  <div class="page-ref">A-2</div>

  <div class="sub-label">A3 Others</div>
  <div class="field-row">
    <span class="fn">19.</span>
    <span>Preference for rest day:&nbsp;<span class="fv-sm" style="min-width:36px;text-align:center;">${esc(String(skillsPref.offDaysPerMonth ?? ""))}&nbsp;</span>&nbsp;rest day(s) per month.</span>
  </div>
  <div class="field-row"><span class="fn">20.</span><span class="fl">Any other remarks:</span><span class="fv">${esc(String(skillsPref.availabilityRemark ?? ""))}&nbsp;</span></div>

  <div class="sec-label" style="margin-top:8px;">(B) SKILLS OF FDW</div>
  <div class="sub-label">B1 Method of Evaluation of Skills</div>
  <p style="font-size:8.5pt;margin-bottom:4px;">Please indicate the method(s) used to evaluate the FDW's skills (can tick more than one):</p>
  <div class="checkbox-row">${cb(false)}&nbsp;Based on FDW's declaration, no evaluation/observation by Singapore EA or overseas training centre/EA</div>
  <div class="checkbox-row">${cb(true)}&nbsp;<span>Interviewed by <u>Singapore EA</u></span></div>
  <div class="indent">
    <div class="checkbox-row">${cb(hasOpt("phone") || hasOpt("telephone"))}&nbsp;Interviewed via telephone/teleconference</div>
    <div class="checkbox-row">${cb(hasOpt("video"))}&nbsp;Interviewed via videoconference</div>
    <div class="checkbox-row">${cb(hasOpt("person"))}&nbsp;Interviewed in person</div>
    <div class="checkbox-row">${cb(false)}&nbsp;Interviewed in person and also made observation of FDW in the areas of work listed in table</div>
  </div>

  <table class="skills" style="margin-top:5px;">
    <thead><tr>
      <th class="sn">S/No</th>
      <th class="area-col">Areas of Work</th>
      <th class="tctr">Willingness<br/>Yes/No</th>
      <th class="tctr">Experience<br/>Yes/No<br/><span style="font-weight:normal;font-size:7pt;">If yes, state<br/>the no. of years</span></th>
      <th class="assess-col">Assessment/Observation<br/><span style="font-weight:normal;font-size:7pt;">Please state qualitative observations of FDW and/or rate the FDW (indicate N.A. if no evaluation was done)&nbsp; Poor…Excellent…N.A &nbsp; 1 2 3 4 5 N.A</span></th>
    </tr></thead>
    <tbody>${skillRows}</tbody>
  </table>

</div>


<!-- ═══════════════════ PAGE A-3 ═══════════════════ -->
<div class="page-separator" data-page="A-3"></div>
${HDR}
<div class="page">
  <div class="page-ref">A-3</div>

  <div class="sec-label">(C) EMPLOYMENT HISTORY OF THE FDW</div>
  <div class="sub-label">C1 Employment History Overseas</div>

  <table class="emp">
    <thead>
      <tr>
        <th colspan="2">Date</th>
        <th style="width:15%;">Country<br/>(including FDW's home country)</th>
        <th style="width:17%;">Employer</th>
        <th style="width:30%;">Work Duties</th>
        <th style="width:14%;">Remarks</th>
      </tr>
      <tr><th class="emp-date">From</th><th class="emp-date">To</th><th></th><th></th><th></th><th></th></tr>
    </thead>
    <tbody>${empRows}</tbody>
  </table>

  <div class="sub-label" style="margin-top:8px;">C2 Employment History in Singapore</div>
  <div class="field-row" style="gap:8px;">
    <span>Previous working experience in Singapore&nbsp;</span>
    ${cb(true)}&nbsp;Yes&nbsp;&nbsp;${cb(false)}&nbsp;No
  </div>
  <p style="font-size:7.5pt;margin:3px 0 7px;line-height:1.45;">(The EA is required to obtain the FDW's employment history from MOM and furnish the employer with the employment history of the FDW. The employer may also verify the FDW's employment history in Singapore through WPOL using SingPass)</p>

  <div class="sub-label">C3 Feedback from previous employers in Singapore</div>
  <p style="font-size:8.5pt;margin-bottom:4px;">Feedback was/was not obtained by the EA from the previous employers. If feedback was obtained (attach testimonial if possible), please indicate the feedback in the table below:</p>
  <table class="emp">
    <thead><tr><th style="width:88px;"></th><th>Feedback</th></tr></thead>
    <tbody>
      <tr><td style="padding:4px 5px;">Employer 1</td><td>&nbsp;</td></tr>
      <tr><td style="padding:4px 5px;">Employer 2</td><td>&nbsp;</td></tr>
    </tbody>
  </table>

  <div class="sec-label" style="margin-top:8px;">(D) AVAILABILITY OF FDW TO BE INTERVIEWED BY PROSPECTIVE EMPLOYER</div>
  <div class="checkbox-row">${cb(false)}&nbsp;FDW is not available for interview</div>
  <div class="checkbox-row">${cb(hasOpt("phone") || hasOpt("telephone"))}&nbsp;FDW can be interviewed by phone</div>
  <div class="checkbox-row">${cb(hasOpt("video"))}&nbsp;FDW can be interviewed by video-conference</div>
  <div class="checkbox-row">${cb(hasOpt("person"))}&nbsp;FDW can be interviewed in person</div>

</div>


<!-- ═══════════════════ PAGE A-4 ═══════════════════ -->
<div class="page-separator" data-page="A-4"></div>
${HDR}
<div class="page">
  <div class="page-ref">A-4</div>
  ${pageA4body}
</div>

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

// ── A4 dimensions ─────────────────────────────────────────────────────────
const A4_W_MM = 210;
const A4_H_MM = 297;
const A4_W_PX = 794;

// ── Canvas → jsPDF  ───────────────────────────────────────────────────────
// Slices the full rendered body at each .page-separator's offsetTop.
// Separators are ZERO HEIGHT → no visual white gaps between page content.
// Slice logic: content BEFORE first separator = page 1, BETWEEN separators = subsequent pages.
const exportMaidProfileViaCanvas = async (maid: MaidProfile): Promise<boolean> => {
  try {
    const [html2canvas, JsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPdf()]);
    const html = buildMomBiodataHtml(maid);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = [
      "position:fixed", "top:0", "left:0",
      `width:${A4_W_PX}px`, "height:1px",
      "border:none", "opacity:0", "pointer-events:none", "z-index:-1",
    ].join(";");
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => { iframe.onload = () => resolve(); iframe.srcdoc = html; });

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) { document.body.removeChild(iframe); return false; }

    const body = iframeDoc.body;
    iframe.style.height = `${body.scrollHeight + 200}px`;

    await Promise.all(Array.from(iframeDoc.images).map(img =>
      new Promise<void>(res => { if (img.complete) { res(); return; } img.onload = () => res(); img.onerror = () => res(); })
    ));

    await new Promise<void>(r => setTimeout(r, 400));
    iframe.style.height = `${body.scrollHeight + 200}px`;
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    // Collect zero-height separator positions to define page boundaries
    const separators = Array.from(iframeDoc.querySelectorAll<HTMLElement>(".page-separator"));
    const totalH = body.scrollHeight;

    // Build boundaries array: [0, sep0.top, sep1.top, …, totalH]
    // Each page = [boundaries[i] … boundaries[i+1]]
    const bounds: number[] = [0, ...separators.map(el => el.offsetTop), totalH];
    const sections: Array<{ top: number; bottom: number }> = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const top = bounds[i];
      const bottom = bounds[i + 1];
      if (bottom > top) sections.push({ top, bottom });
    }
    if (sections.length === 0) sections.push({ top: 0, bottom: totalH });

    const canvas = await html2canvas(body, {
      scale: 2, useCORS: true, allowTaint: false,
      backgroundColor: "#ffffff", logging: false,
      width: A4_W_PX, windowWidth: A4_W_PX,
    });

    document.body.removeChild(iframe);

    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pxPerMm = (canvas.width / 2) / A4_W_MM;

    sections.forEach((section, idx) => {
      if (idx > 0) pdf.addPage();

      const srcY  = section.top;
      const srcH  = section.bottom - section.top;
      const clampH = Math.min(srcH, (canvas.height / 2) - srcY);
      if (clampH <= 0) return;

      const sc = document.createElement("canvas");
      sc.width  = canvas.width;
      sc.height = Math.round(clampH * 2);
      const ctx = sc.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, Math.round(srcY * 2), canvas.width, Math.round(clampH * 2),
          0, 0, sc.width, sc.height,
        );
      }

      pdf.addImage(sc.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, A4_W_MM, Math.min(clampH / pxPerMm, A4_H_MM));
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
  const canvasOk = await exportMaidProfileViaCanvas(maid);
  if (canvasOk) return;

  // Fallback: pdf-lib text + print window
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${maid.fullName || maid.referenceCode} Bio-data`);
  pdf.setSubject(`MAID_PROFILE_JSON_BASE64:${encodeBase64Utf8(JSON.stringify(buildImportPayloadWithPhoto(maid)))}`);
  pdf.setCreator("Helped Maid Portal");
  pdf.setProducer("Helped Maid Portal");

  const font     = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42, lineHeight = 15, maxWidth = pageSize[0] - margin * 2;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;
  const newPage = () => { page = pdf.addPage(pageSize); y = pageSize[1] - margin; };

  const drawWrapped = (text: string, size = 10, bold = false, color = rgb(0.12, 0.14, 0.18)) => {
    const af = bold ? boldFont : font;
    const words = normalizeText(text).split(" ").filter(Boolean);
    let line = "";
    const commit = (v: string) => { if (y < margin + lineHeight) newPage(); page.drawText(v, { x: margin, y, size, font: af, color }); y -= lineHeight; };
    if (!words.length) { commit("-"); return; }
    words.forEach(w => { const next = line ? `${line} ${w}` : w; if (af.widthOfTextAtSize(next, size) <= maxWidth) { line = next; return; } if (line) commit(line); line = w; });
    if (line) commit(line);
  };

  page.drawText("Maid Bio-data", { x: margin, y, size: 20, font: boldFont, color: rgb(0.07, 0.38, 0.3) });
  y -= 28;
  page.drawText(`Generated ${new Date().toLocaleDateString("en-SG")}`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.44, 0.5) });
  y -= 22;

  const primaryPhoto = getPrimaryPhoto(maid);
  if (primaryPhoto) {
    try {
      const { bytes, mimeType } = dataUrlToBytes(primaryPhoto);
      const image = mimeType.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const scaled = image.scale(0.28);
      page.drawImage(image, { x: pageSize[0] - margin - scaled.width, y: pageSize[1] - margin - scaled.height, width: scaled.width, height: scaled.height });
    } catch { /* ignore */ }
  }

  getSectionRows(maid).forEach(section => {
    if (y < margin + 80) newPage();
    page.drawText(section.title, { x: margin, y, size: 13, font: boldFont, color: rgb(0.07, 0.38, 0.3) });
    y -= 18;
    section.rows.forEach(([label, value]) => drawWrapped(`${label}: ${normalizeText(value) || "N/A"}`, 10));
    y -= 8;
  });

  const bytes = await pdf.save({ useObjectStreams: false });
  downloadBytes(`${maid.referenceCode || maid.fullName}-bio-data.pdf`, bytes, "application/pdf");

  const htmlForPrint = buildMomBiodataHtml(maid);
  const printStyle = `<style>@page{size:A4;margin:0}@media print{.page-separator{page-break-before:always;break-before:page}}</style>`;
  const htmlWithPrint = htmlForPrint.replace("</head>", `${printStyle}</head>`);

  const printIframe = document.createElement("iframe");
  printIframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;opacity:0;pointer-events:none;";
  document.body.appendChild(printIframe);
  const cleanup = () => setTimeout(() => { if (printIframe.parentNode) document.body.removeChild(printIframe); }, 3000);

  printIframe.onload = () => {
    try {
      const d = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!d) { cleanup(); return; }
      d.open(); d.write(htmlWithPrint); d.close();
      Promise.all(Array.from(d.images).map(img =>
        new Promise<void>(res => { if (img.complete) { res(); return; } img.onload = () => res(); img.onerror = () => res(); })
      )).then(() => { printIframe.contentWindow?.focus(); printIframe.contentWindow?.print(); cleanup(); });
    } catch { cleanup(); }
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

  const font     = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42, rowHeight = 18;
  const columns = [
    { label: "Reference",   width: 90 }, { label: "Name",       width: 160 },
    { label: "Nationality", width: 100 }, { label: "Type",       width: 88 },
    { label: "Status",      width: 65 },  { label: "Public",     width: 50 },
  ];

  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawHeader = () => {
    page.drawText("Maids PDF Export", { x: margin, y, size: 18, font: boldFont, color: rgb(0.07, 0.38, 0.3) }); y -= 22;
    page.drawText(`Total records: ${maids.length}`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.44, 0.5) }); y -= 18;
    let x = margin;
    columns.forEach(col => { page.drawText(col.label, { x, y, size: 9, font: boldFont, color: rgb(0.12, 0.14, 0.18) }); x += col.width; });
    y -= 12;
  };
  const newPage2 = () => { page = pdf.addPage(pageSize); y = pageSize[1] - margin; drawHeader(); };

  const fit = (value: string, width: number) => {
    const text = normalizeText(value);
    if (font.widthOfTextAtSize(text, 8) <= width) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, 8) > width) t = t.slice(0, -1);
    return `${t}...`;
  };

  drawHeader();
  maids.forEach(maid => {
    if (y < margin + rowHeight) newPage2();
    let x = margin;
    [maid.referenceCode, maid.fullName, maid.nationality, maid.type, maid.status || "available", maid.isPublic ? "Yes" : "No"].forEach((val, i) => {
      page.drawText(fit(String(val ?? ""), columns[i].width - 6), { x, y, size: 8, font, color: rgb(0.12, 0.14, 0.18) });
      x += columns[i].width;
    });
    y -= rowHeight;
  });

  const bytes = await pdf.save({ useObjectStreams: false });
  downloadBytes(`maids-${new Date().toISOString().slice(0, 10)}.pdf`, bytes, "application/pdf");
};