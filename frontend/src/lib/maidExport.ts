import { MaidProfile } from "@/lib/maids";

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

const buildImportPayload = (maid: MaidProfile) => {
  const { id, createdAt, updatedAt, photoDataUrl, photoDataUrls, videoDataUrl, ...rest } = maid;
  return { ...rest, photoDataUrl: "", photoDataUrls: [], videoDataUrl: "" } satisfies MaidProfile;
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
  const photoSrc = photos[0] || FULLBODY_PHOTO;

  const age = calcAge(maid.dateOfBirth);
  const importPayloadBase64 = encodeBase64Utf8(JSON.stringify(buildImportPayload(maid)));

  // ── Work-area rows ──────────────────────────────────────────────────────
  const workAreaRows = (workAreas as Array<[string, { willing?: boolean; experience?: boolean; evaluation?: string }]>)
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
        <td class="center">${esc(yesNo(cfg.experience ?? false))}</td>
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

export const exportMaidProfileToPdf = (maid: MaidProfile) => {
  const html = buildMomBiodataHtml(maid);
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) throw new Error("Unable to open print window");
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};