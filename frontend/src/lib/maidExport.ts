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

const sectionTitle = (title: string) => `<h2>${escapeHtml(title)}</h2>`;

const renderKeyValueTable = (rows: Array<[string, string]>) => `
  <table>
    <tbody>
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const renderBooleanTable = (rows: Array<[string, boolean]>) => `
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Answer</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td>${escapeHtml(label)}</td>
              <td>${value ? "Yes" : "No"}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

const renderMatrixTable = (
  headers: string[],
  rows: string[][]
) => `
  <table>
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>
          `
        )
        .join("")}
    </tbody>
  </table>
`;

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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(maid.fullName)} Bio-data</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 24px; line-height: 1.45; }
          h1 { font-size: 28px; margin-bottom: 4px; }
          h2 { font-size: 18px; margin: 24px 0 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
          p.meta { color: #6b7280; margin-top: 0; }
          .hero { display: grid; grid-template-columns: 180px 1fr; gap: 18px; align-items: start; }
          .photo img { width: 180px; height: 220px; object-fit: cover; border: 1px solid #d1d5db; border-radius: 8px; }
          .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-top: 12px; }
          .gallery img { width: 100%; height: 110px; object-fit: cover; border: 1px solid #d1d5db; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { width: 240px; background: #f3f4f6; }
          .section { margin-top: 18px; }
          .text-block { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(maid.fullName)}</h1>
        <p class="meta">Reference Code: ${escapeHtml(maid.referenceCode)} | Last updated: ${escapeHtml(formatDate(maid.updatedAt))}</p>

        <div class="hero">
          <div class="photo">
            ${
              photos[0]
                ? `<img src="${photos[0]}" alt="${escapeHtml(maid.fullName)}" />`
                : `<div style="height:220px;border:1px solid #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;">No Photo</div>`
            }
          </div>
          <div>
            ${sectionTitle("Personal Details")}
            ${renderKeyValueTable(detailRows)}
          </div>
        </div>

        ${photos.length > 1 ? `<div class="gallery">${photos.slice(1).map((photo) => `<img src="${photo}" alt="Gallery photo" />`).join("")}</div>` : ""}

        <div class="section">
          ${sectionTitle("Language Skills")}
          <div class="text-block">${escapeHtml(languages.join(", ") || "N/A")}</div>
        </div>

        <div class="section">
          ${sectionTitle("Other Information")}
          ${
            Object.keys(otherInformation).length > 0
              ? renderBooleanTable(Object.entries(otherInformation))
              : `<div class="text-block">No other information available.</div>`
          }
        </div>

        <div class="section">
          ${sectionTitle("Maid Skills")}
          ${
            workAreas.length > 0
              ? renderMatrixTable(
                  ["Area", "Willingness", "Experience", "Evaluation"],
                  workAreas.map(([area, config]) => [
                    area,
                    config.willing ? "Yes" : "No",
                    config.experience ? "Yes" : "No",
                    config.evaluation || "-",
                  ])
                )
              : `<div class="text-block">No skill records available.</div>`
          }
        </div>

        <div class="section">
          ${sectionTitle("Employment History")}
          ${
            employment.length > 0
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
              : `<div class="text-block">No employment history available.</div>`
          }
        </div>

        <div class="section">
          ${sectionTitle("Medical History / Dietary Restrictions")}
          ${renderKeyValueTable(medicalRows)}
          ${
            Object.keys(pastIllnesses).length > 0
              ? `
                <div class="section">
                  <h2>Past and Existing Illnesses</h2>
                  ${renderBooleanTable(Object.entries(pastIllnesses))}
                </div>
              `
              : ""
          }
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
    </html>
  `;
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
