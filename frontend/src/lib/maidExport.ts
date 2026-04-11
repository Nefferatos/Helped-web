import { MaidProfile } from "@/lib/maids";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const sectionTitle = (title: string) =>
  `<h2>${escapeHtml(title)}</h2>`;

const renderKeyValueTable = (rows: Array<[string, string]>) => `
  <table class="kv">
    <tbody>
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value) || "<span class='empty'>—</span>"}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const renderBooleanTable = (rows: Array<[string, boolean]>) => `
  <table class="bool">
    <thead>
      <tr>
        <th>Question</th>
        <th style="width:70px;text-align:center;">Answer</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td>${escapeHtml(label)}</td>
              <td style="text-align:center;">
                <span class="pill ${value ? "yes" : "no"}">${value ? "YES" : "NO"}</span>
              </td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const renderMatrixTable = (headers: string[], rows: string[][]) => `
  <table class="matrix">
    <thead>
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>${row.map((value) => `<td>${escapeHtml(value) || "—"}</td>`).join("")}</tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const encodeBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const buildImportPayload = (maid: MaidProfile) => {
  const { id, createdAt, updatedAt, photoDataUrl, photoDataUrls, videoDataUrl, ...rest } = maid;
  return {
    ...rest,
    photoDataUrl: "",
    photoDataUrls: [],
    videoDataUrl: "",
  } satisfies MaidProfile;
};

const buildMaidProfileHtml = (maid: MaidProfile) => {
  const agencyContact = maid.agencyContact as Record<string, unknown>;
  const introduction = maid.introduction as Record<string, unknown>;
  const skillsPreferences = maid.skillsPreferences as Record<string, unknown>;
  const otherInformation = (skillsPreferences.otherInformation as Record<string, boolean>) || {};
  const pastIllnesses = (introduction.pastIllnesses as Record<string, boolean>) || {};
  const workAreas = Object.entries(maid.workAreas || {}) as Array<
    [string, { willing?: boolean; experience?: boolean; evaluation?: string }]
  >;
  const employment = Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [];
  const languages = Object.entries(maid.languageSkills || {}).map(
    ([language, level]) => `${language} (${String(level)})`
  );
  const photos =
    Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0
      ? maid.photoDataUrls
      : maid.photoDataUrl
      ? [maid.photoDataUrl]
      : [];
  const age = calculateAge(maid.dateOfBirth);

  const detailRows: Array<[string, string]> = [
    ["Maid Name", maid.fullName],
    ["Reference Code", maid.referenceCode],
    ["Type", maid.type],
    ["Nationality", maid.nationality],
    ["Date of Birth", formatDate(maid.dateOfBirth)],
    ["Age", age !== null ? String(age) : "N/A"],
    ["Place of Birth", maid.placeOfBirth],
    ["Height / Weight", `${maid.height}cm / ${maid.weight}kg`],
    ["Religion", maid.religion],
    ["Marital Status", maid.maritalStatus],
    ["Number of Children", String(maid.numberOfChildren)],
    ["Number of Siblings", String(maid.numberOfSiblings)],
    ["Education", maid.educationLevel],
    ["Home Address", maid.homeAddress],
    ["Airport To Be Repatriated", maid.airportRepatriation],
    ["Agency Contact", String(agencyContact.contactPerson || "N/A")],
    ["Agency Phone", String(agencyContact.phone || "N/A")],
    ["License No.", String(agencyContact.licenseNo || "N/A")],
    ["Passport No.", String(agencyContact.passportNo || "N/A")],
  ];

  const medicalRows: Array<[string, string]> = [
    ["Allergies", String(introduction.allergies || "N/A")],
    ["Physical Disabilities", String(introduction.physicalDisabilities || "N/A")],
    ["Dietary Restrictions", String(introduction.dietaryRestrictions || "N/A")],
    ["Food Handling Preferences", String(introduction.foodHandlingPreferences || "N/A")],
    ["Other Illnesses", String(introduction.otherIllnesses || "N/A")],
    ["Other Remarks", String(introduction.otherRemarks || "N/A")],
  ];

  const availabilityRows: Array<[string, string]> = [
    ["Available From", String(introduction.availability || "N/A")],
    ["Contract Ends", String(introduction.contractEnds || "N/A")],
    ["Present Salary", String(introduction.presentSalary || "N/A")],
    ["Expected Salary", String(introduction.expectedSalary || "N/A")],
    ["Offday Compensation", String(introduction.offdayCompensation || "N/A")],
    ["Off-days Per Month", String(skillsPreferences.offDaysPerMonth || "N/A")],
    ["Availability Remark", String(skillsPreferences.availabilityRemark || "N/A")],
  ];

  const privateRows: Array<[string, string]> = [
    ["Ages of Children", String(introduction.agesOfChildren || "N/A")],
    ["Maid Loan", String(introduction.maidLoan || "N/A")],
    ["Private Info", String(skillsPreferences.privateInfo || "N/A")],
  ];

  const importPayloadBase64 = encodeBase64Utf8(JSON.stringify(buildImportPayload(maid)));

  const css = `
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #111827;
      margin: 0;
      padding: 28px 32px;
      line-height: 1.5;
      background: #fff;
    }

    /* ── Page header ── */
    .page-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .page-header h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 3px;
      color: #111827;
    }
    .page-header .meta {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
    }

    /* ── Hero layout ── */
    .hero {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 20px;
      align-items: start;
    }
    .photo-col img {
      width: 200px;
      height: auto;
      display: block;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }
    .photo-col .no-photo {
      width: 200px;
      height: 240px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
      background: #f9fafb;
    }

    /* ── Gallery: full images, no cropping ── */
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .gallery img {
      width: 100%;
      height: auto;
      display: block;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }

    /* ── Section titles ── */
    .section { margin-top: 20px; }
    h2 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #fff;
      background: #111827;
      padding: 5px 10px;
      margin: 0;
    }

    /* ── KV table ── */
    table.kv { width: 100%; border-collapse: collapse; }
    table.kv th,
    table.kv td {
      border: 1px solid #e5e7eb;
      padding: 5px 10px;
      vertical-align: top;
      font-size: 12px;
    }
    table.kv th {
      width: 210px;
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }
    table.kv td { color: #111827; }
    table.kv tbody tr:nth-child(even) td { background: #fafafa; }

    /* ── Boolean table ── */
    table.bool { width: 100%; border-collapse: collapse; }
    table.bool th,
    table.bool td {
      border: 1px solid #e5e7eb;
      padding: 5px 10px;
      font-size: 12px;
      vertical-align: middle;
    }
    table.bool thead th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    table.bool tbody tr:nth-child(even) td { background: #fafafa; }

    /* ── Matrix table ── */
    table.matrix { width: 100%; border-collapse: collapse; }
    table.matrix th,
    table.matrix td {
      border: 1px solid #e5e7eb;
      padding: 5px 10px;
      font-size: 12px;
      vertical-align: top;
    }
    table.matrix thead th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }
    table.matrix tbody tr:nth-child(even) td { background: #fafafa; }

    /* ── Pills ── */
    .pill {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .pill.yes { background: #dcfce7; color: #166534; }
    .pill.no  { background: #f3f4f6; color: #6b7280; }

    /* ── Text block ── */
    .text-block {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      white-space: pre-wrap;
      font-size: 12px;
      color: #111827;
      background: #fafafa;
      line-height: 1.6;
    }
    .empty { color: #9ca3af; }

    @media print {
      body { padding: 16px 20px; }
      .section { page-break-inside: avoid; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(maid.fullName)} Bio-data</title>
  <style>${css}</style>
</head>
<body>
  <!--MAID_PROFILE_JSON_BASE64:${importPayloadBase64}-->

  <div class="page-header">
    <h1>${escapeHtml(maid.fullName)}</h1>
    <p class="meta">Reference Code: ${escapeHtml(maid.referenceCode)} &nbsp;|&nbsp; Last updated: ${escapeHtml(formatDate(maid.updatedAt))}</p>
  </div>

  <div class="hero">
    <div class="photo-col">
      ${photos[0]
        ? `<img src="${photos[0]}" alt="${escapeHtml(maid.fullName)}" />`
        : `<div class="no-photo">No Photo</div>`}
    </div>
    <div>
      ${sectionTitle("Personal Details")}
      ${renderKeyValueTable(detailRows)}
    </div>
  </div>

  ${photos.length > 1
    ? `<div class="gallery">${photos.slice(1).map((p) => `<img src="${p}" alt="Gallery photo" />`).join("")}</div>`
    : ""}

  <div class="section">
    ${sectionTitle("Language Skills")}
    <div class="text-block">${escapeHtml(languages.join(", ") || "N/A")}</div>
  </div>

  <div class="section">
    ${sectionTitle("Other Information")}
    ${Object.keys(otherInformation).length > 0
      ? renderBooleanTable(Object.entries(otherInformation) as Array<[string, boolean]>)
      : `<div class="text-block">No other information available.</div>`}
  </div>

  <div class="section">
    ${sectionTitle("Maid Skills")}
    ${workAreas.length > 0
      ? renderMatrixTable(
          ["Area", "Willingness", "Experience", "Evaluation"],
          workAreas.map(([area, config]) => [
            area,
            config.willing ? "Yes" : "No",
            config.experience ? "Yes" : "No",
            config.evaluation || "—",
          ])
        )
      : `<div class="text-block">No skill records available.</div>`}
  </div>

  <div class="section">
    ${sectionTitle("Employment History")}
    ${employment.length > 0
      ? renderMatrixTable(
          ["From", "To", "Country", "Employer", "Maid Duties", "Remarks"],
          employment.map((entry) => {
            const row = entry as Record<string, string>;
            return [
              row.from || "",
              row.to || "",
              row.country || "",
              row.employer || "",
              row.duties || "",
              row.remarks || "",
            ];
          })
        )
      : `<div class="text-block">No employment history available.</div>`}
  </div>

  <div class="section">
    ${sectionTitle("Medical History / Dietary Restrictions")}
    ${renderKeyValueTable(medicalRows)}
    ${Object.keys(pastIllnesses).length > 0
      ? `<div class="section">
           ${sectionTitle("Past and Existing Illnesses")}
           ${renderBooleanTable(Object.entries(pastIllnesses) as Array<[string, boolean]>)}
         </div>`
      : ""}
  </div>

  <div class="section">
    ${sectionTitle("Availability / Remark")}
    ${renderKeyValueTable(availabilityRows)}
  </div>

  <div class="section">
    ${sectionTitle("Public Introduction")}
    <div class="text-block">${escapeHtml(String(introduction.publicIntro || "Maid Introduction in Public is empty."))}</div>
  </div>

  <div class="section">
    ${sectionTitle("Introduction")}
    <div class="text-block">${escapeHtml(String(introduction.intro || "(Employer login is required to view this Introduction)"))}</div>
  </div>

  <div class="section">
    ${sectionTitle("Private Information")}
    ${renderKeyValueTable(privateRows)}
  </div>

</body>
</html>`;
};

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
  const html = buildMaidProfileHtml(maid);
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  downloadBlob(`${maid.referenceCode || maid.fullName}-bio-data.doc`, blob);
};

export const exportMaidProfileToExcel = (maid: MaidProfile) => {
  const html = buildMaidProfileHtml(maid);
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(`${maid.referenceCode || maid.fullName}-bio-data.xls`, blob);
};

export const exportMaidProfileToPdf = (maid: MaidProfile) => {
  const html = buildMaidProfileHtml(maid);
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) {
    throw new Error("Unable to open print window");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};