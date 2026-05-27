import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const baseUrl = process.env.ATS_SMOKE_BASE_URL || "http://127.0.0.1:8787";
const useTinyFixtures = process.env.ATS_SMOKE_TINY === "true";

const samplePaths = {
  pdf: path.join(repoRoot, "frontend", "public", "fdw-bio-data-form.pdf"),
  jpg: path.join(repoRoot, "frontend", "public", "maid_agency_logo_81.jpg"),
  png: path.join(repoRoot, "frontend", "public", "findmaids_logo.png"),
};

const mustRead = async (filePath) => {
  const buffer = await readFile(filePath);
  return new Uint8Array(buffer);
};

const makeFile = (bytes, name, type) => new File([bytes], name, { type });

const tinyFixtures = {
  pdf: new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  jpg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  png: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
};

const buildFormData = async () => {
  const [pdfBytes, jpgBytes, pngBytes] = useTinyFixtures
    ? [tinyFixtures.pdf, tinyFixtures.jpg, tinyFixtures.png]
    : await Promise.all([
        mustRead(samplePaths.pdf),
        mustRead(samplePaths.jpg),
        mustRead(samplePaths.png),
      ]);

  const now = Date.now();
  const formData = new FormData();

  const fields = {
    agencyId: "1",
    fullName: `ATS Smoke Test ${now}`,
    email: `ats-smoke-${now}@example.com`,
    contactNumber: "6591234567",
    nationality: "Filipino maid",
    dateOfBirth: "1992-06-15",
    maritalStatus: "Single",
    address: "123 Test Street",
    yearsOfExperience: "5",
    previousCountriesWorkedIn: "Singapore, Malaysia",
    childcareExperience: "4",
    newbornCareExperience: "3",
    elderlyCareExperience: "2",
    disabledCareExperience: "1",
    housekeepingExperience: "5",
    cookingSkills: "Chinese food, Indian food",
    petCareExperience: "2",
    languageSkills: "English, Tagalog",
    certifications: "Caregiver Certificate, CPR",
    trainingRecords: "FDW training school",
    availableDate: "2026-06-15",
    expectedSalary: "750",
    employmentPreference: "Transfer, full-time live-in",
    coverNote: "Smoke test submission for ATS upload verification.",
    placeOfBirth: "Manila",
    heightCm: "158",
    weightKg: "53",
    residentialAddressLine1: "Line 1",
    residentialAddressLine2: "Line 2",
    repatriationPort: "NAIA",
    homeCountryContactNumber: "639123456789",
    religion: "Catholic",
    educationLevel: "College / Degree (>=13 yrs)",
    numberOfSiblings: "3",
    numberOfChildren: "1",
    childrenAges: "8",
    allergies: "None",
    physicalDisabilities: "None",
    dietaryRestrictions: "None",
    foodPreference: "No preference",
    foodPreferenceOther: "",
    medicalConditions: "None",
    restDayPreference: "2 rest days",
    otherRemarksA3: "Smoke test",
    workedInSingapore: "yes",
    sgInfantsChildrenAssessment: "Experienced",
    sgElderlyAssessment: "Basic",
    sgDisabledAssessment: "Basic",
    sgHouseworkAssessment: "Strong",
    sgCookingAssessment: "Good",
    sgLanguageAssessment: "Conversational English",
    sgOtherSkills: "Sewing",
    sgOtherSkillsAssessment: "Basic",
    foreignTrainingCentreName: "Test Training Centre",
    thirdPartyCertificationDetails: "Issued 2025",
    overseasInfantsChildrenAssessment: "Good",
    overseasElderlyAssessment: "Basic",
    overseasDisabledAssessment: "Basic",
    overseasHouseworkAssessment: "Strong",
    overseasCookingAssessment: "Good",
    overseasLanguageAssessment: "Good",
    overseasOtherSkills: "Gardening",
    overseasOtherSkillsAssessment: "Basic",
    feedbackEmployer1: "Positive",
    feedbackEmployer2: "Positive",
    otherRemarksE: "Completed by smoke test script",
    employmentHistoryCount: "4",
    employmentHistory1From: "2018",
    employmentHistory1To: "2020",
    employmentHistory1Country: "Singapore",
    employmentHistory1Employer: "Employer One",
    employmentHistory1Duties: "Childcare and housekeeping",
    employmentHistory1Remarks: "Completed contract",
    employmentHistory2From: "2020",
    employmentHistory2To: "2022",
    employmentHistory2Country: "Malaysia",
    employmentHistory2Employer: "Employer Two",
    employmentHistory2Duties: "Cooking and cleaning",
    employmentHistory2Remarks: "Completed contract",
    employmentHistory3From: "2022",
    employmentHistory3To: "2024",
    employmentHistory3Country: "Hong Kong",
    employmentHistory3Employer: "Employer Three",
    employmentHistory3Duties: "Elderly care",
    employmentHistory3Remarks: "Completed contract",
    employmentHistory4From: "2024",
    employmentHistory4To: "Present",
    employmentHistory4Country: "Singapore",
    employmentHistory4Employer: "Employer Four",
    employmentHistory4Duties: "General housework",
    employmentHistory4Remarks: "Transfer-ready",
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  formData.append("resume", makeFile(pdfBytes, "resume.pdf", "application/pdf"));
  formData.append("passport", makeFile(jpgBytes, "passport.jpg", "image/jpeg"));
  formData.append("medical", makeFile(pngBytes, "medical.png", "image/png"));
  formData.append("references", makeFile(new TextEncoder().encode("Reference letter sample"), "reference.doc", "application/msword"));
  formData.append("certificates", makeFile(new TextEncoder().encode("Certificate sample"), "certificate.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
  formData.append("otherDocuments", makeFile(pdfBytes, "other-document.pdf", "application/pdf"));
  formData.append("introVideo", makeFile(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]), "intro.mov", "video/quicktime"));

  return formData;
};

const assertOk = async (response, label) => {
  if (response.ok) return response;
  const body = await response.text();
  throw new Error(`${label} failed (${response.status}): ${body}`);
};

const main = async () => {
  console.log(`ATS upload smoke test against ${baseUrl}`);

  const diagnosticsResponse = await assertOk(
    await fetch(`${baseUrl}/api/diagnostics`),
    "Diagnostics request",
  );
  const diagnostics = await diagnosticsResponse.json();
  console.log("Diagnostics:", JSON.stringify(diagnostics, null, 2));

  const formData = await buildFormData();
  const submitResponse = await assertOk(
    await fetch(`${baseUrl}/api/ats/public/apply`, {
      method: "POST",
      body: formData,
    }),
    "ATS submit",
  );
  const submitted = await submitResponse.json();
  console.log("Submission:", JSON.stringify(submitted, null, 2));

  const summaryResponse = await assertOk(
    await fetch(
      `${baseUrl}/api/ats/public/applications/${encodeURIComponent(submitted.applicationId)}?token=${encodeURIComponent(submitted.applicantAccessToken)}`,
    ),
    "ATS summary",
  );
  const summary = await summaryResponse.json();

  console.log("Saved document summary:");
  for (const document of summary.documents) {
    console.log(
      `- ${document.type}: ${document.name} [${document.status}]${document.url ? ` -> ${document.url.slice(0, 80)}...` : ""}`,
    );
  }

  const expectedTypes = ["resume", "passport", "medical", "reference", "certificate", "other", "video"];
  const actualTypes = new Set(summary.documents.map((document) => document.type));
  const missingTypes = expectedTypes.filter((type) => !actualTypes.has(type));

  if (missingTypes.length > 0) {
    throw new Error(`Missing uploaded document types: ${missingTypes.join(", ")}`);
  }

  if (summary.documents.length !== expectedTypes.length) {
    throw new Error(`Expected ${expectedTypes.length} documents, got ${summary.documents.length}`);
  }

  console.log("Smoke test passed: all expected upload types were accepted and saved.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
