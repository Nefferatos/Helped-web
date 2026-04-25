export type EmployerDocumentFile = {
  name: string;
  url: string;
  category: string;
};

let pdfLibLoader: Promise<typeof import("pdf-lib")> | null = null;

const loadPdfLib = async () => {
  pdfLibLoader ??= import("pdf-lib");
  return await pdfLibLoader;
};

interface FormData {
  maid: {
    name: string;
    nationality: string;
    workPermitNo: string;
    finNo: string;
    passportNo: string;
    salary: string;
    numberOfTerms: string;
    communicationToBuy: string;
    nameOfReplacement: string;
    passportOfMaid: string;
  };
  agency: {
    contractDate: string;
    serviceFee: string;
    deposit: string;
    handlingInHospitalFee: string;
    medicalFee: string;
    extensionFee: string;
    discountedFee: string;
    placementFee: string;
    balanceFee: string;
    agencyWitness: string;
  };
  employer: {
    name: string;
    gender: string;
    dateOfBirthDay: string;
    dateOfBirthMonth: string;
    dateOfBirthYear: string;
    nationality: string;
    residentialStatus: string;
    nric: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    typeOfResidence: string;
    occupation: string;
    company: string;
    email: string;
    residentialPhone: string;
    mobileNumber: string;
    monthlyContribution: string;
    dateOfEmployment: string;
  };
  spouse: {
    name: string;
    gender: string;
    dateOfBirthDay: string;
    dateOfBirthMonth: string;
    dateOfBirthYear: string;
    nationality: string;
    residentialStatus: string;
    nric: string;
    occupation: string;
    company: string;
  };
  familyMembers: Array<{
    name: string;
    type: string;
    relationship: string;
    dateOfBirth: string;
  }>;
  notificationDate: {
    month: string;
    year: string;
  };
};

const isPdfFile = (file: EmployerDocumentFile) => /\.pdf$/i.test(file.name);

const getPdfFiles = (files: EmployerDocumentFile[]) => {
  const pdfFiles = files.filter(isPdfFile);
  if (pdfFiles.length === 0) {
    throw new Error("No PDF files are available to download or print");
  }
  return pdfFiles;
};

const fetchPdfBytes = async (file: EmployerDocumentFile) => {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Failed to load ${file.name}`);
  }
  return response.arrayBuffer();
};

export const mergeEmployerPdfFiles = async (files: EmployerDocumentFile[]) => {
  const pdfFiles = getPdfFiles(files);
  const { PDFDocument } = await loadPdfLib();
  const mergedPdf = await PDFDocument.create();

  for (const file of pdfFiles) {
    const bytes = await fetchPdfBytes(file);
    const pdf = await PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  return {
    bytes: mergedBytes,
    skippedCount: files.length - pdfFiles.length,
  };
};

const generateFormHtml = (formData: FormData | undefined) => {
  if (!formData) return "";

  let html =
    '<div style="font-family: Arial, sans-serif; padding: 20px; margin-bottom: 20px; border-bottom: 1px solid #ccc;">';

  html += '<h1 style="color: #333;">Employer Contract Form</h1>';

  // Maid
  html += '<h2 style="color: #555;">Maid Information</h2>';
  html += `<p><strong>Name:</strong> ${formData.maid?.name || ""}</p>`;
  html += `<p><strong>Nationality:</strong> ${formData.maid?.nationality || ""}</p>`;
  html += `<p><strong>Work Permit No:</strong> ${formData.maid?.workPermitNo || ""}</p>`;
  html += `<p><strong>FIN No:</strong> ${formData.maid?.finNo || ""}</p>`;
  html += `<p><strong>Passport No:</strong> ${formData.maid?.passportNo || ""}</p>`;
  html += `<p><strong>Salary:</strong> ${formData.maid?.salary || ""}</p>`;
  html += `<p><strong>Number of Terms:</strong> ${formData.maid?.numberOfTerms || ""}</p>`;
  html += `<p><strong>Communication to Buy:</strong> ${formData.maid?.communicationToBuy || ""}</p>`;
  html += `<p><strong>Name of Replacement:</strong> ${formData.maid?.nameOfReplacement || ""}</p>`;
  html += `<p><strong>Passport of Maid:</strong> ${formData.maid?.passportOfMaid || ""}</p>`;

  // Agency
  html += '<h2 style="color: #555;">Agency Information</h2>';
  html += `<p><strong>Contract Date:</strong> ${formData.agency?.contractDate || ""}</p>`;
  html += `<p><strong>Service Fee:</strong> ${formData.agency?.serviceFee || ""}</p>`;
  html += `<p><strong>Deposit:</strong> ${formData.agency?.deposit || ""}</p>`;
  html += `<p><strong>Handling in Hospital Fee:</strong> ${formData.agency?.handlingInHospitalFee || ""}</p>`;
  html += `<p><strong>Medical Fee:</strong> ${formData.agency?.medicalFee || ""}</p>`;
  html += `<p><strong>Extension Fee:</strong> ${formData.agency?.extensionFee || ""}</p>`;
  html += `<p><strong>Discounted Fee:</strong> ${formData.agency?.discountedFee || ""}</p>`;
  html += `<p><strong>Placement Fee:</strong> ${formData.agency?.placementFee || ""}</p>`;
  html += `<p><strong>Balance Fee:</strong> ${formData.agency?.balanceFee || ""}</p>`;
  html += `<p><strong>Agency Witness:</strong> ${formData.agency?.agencyWitness || ""}</p>`;

  // Employer
  html += '<h2 style="color: #555;">Employer Information</h2>';
  html += `<p><strong>Name:</strong> ${formData.employer?.name || ""}</p>`;
  html += `<p><strong>Gender:</strong> ${formData.employer?.gender || ""}</p>`;
  html += `<p><strong>Date of Birth:</strong> ${formData.employer?.dateOfBirthDay || ""}/${formData.employer?.dateOfBirthMonth || ""}/${formData.employer?.dateOfBirthYear || ""}</p>`;
  html += `<p><strong>Nationality:</strong> ${formData.employer?.nationality || ""}</p>`;
  html += `<p><strong>Residential Status:</strong> ${formData.employer?.residentialStatus || ""}</p>`;
  html += `<p><strong>NRIC:</strong> ${formData.employer?.nric || ""}</p>`;
  html += `<p><strong>Address:</strong> ${formData.employer?.addressLine1 || ""} ${formData.employer?.addressLine2 || ""}</p>`;
  html += `<p><strong>Postal Code:</strong> ${formData.employer?.postalCode || ""}</p>`;
  html += `<p><strong>Type of Residence:</strong> ${formData.employer?.typeOfResidence || ""}</p>`;
  html += `<p><strong>Occupation:</strong> ${formData.employer?.occupation || ""}</p>`;
  html += `<p><strong>Company:</strong> ${formData.employer?.company || ""}</p>`;
  html += `<p><strong>Email:</strong> ${formData.employer?.email || ""}</p>`;
  html += `<p><strong>Residential Phone:</strong> ${formData.employer?.residentialPhone || ""}</p>`;
  html += `<p><strong>Mobile Number:</strong> ${formData.employer?.mobileNumber || ""}</p>`;
  html += `<p><strong>Monthly Contribution:</strong> ${formData.employer?.monthlyContribution || ""}</p>`;
  html += `<p><strong>Date of Employment:</strong> ${formData.employer?.dateOfEmployment || ""}</p>`;

  // Spouse
  html += '<h2 style="color: #555;">Spouse Information</h2>';
  html += `<p><strong>Name:</strong> ${formData.spouse?.name || ""}</p>`;
  html += `<p><strong>Gender:</strong> ${formData.spouse?.gender || ""}</p>`;
  html += `<p><strong>Date of Birth:</strong> ${formData.spouse?.dateOfBirthDay || ""}/${formData.spouse?.dateOfBirthMonth || ""}/${formData.spouse?.dateOfBirthYear || ""}</p>`;
  html += `<p><strong>Nationality:</strong> ${formData.spouse?.nationality || ""}</p>`;
  html += `<p><strong>Residential Status:</strong> ${formData.spouse?.residentialStatus || ""}</p>`;
  html += `<p><strong>NRIC:</strong> ${formData.spouse?.nric || ""}</p>`;
  html += `<p><strong>Occupation:</strong> ${formData.spouse?.occupation || ""}</p>`;
  html += `<p><strong>Company:</strong> ${formData.spouse?.company || ""}</p>`;

  // Family Members
  html += '<h2 style="color: #555;">Family Members</h2>';
  if (formData.familyMembers?.length) {
    formData.familyMembers.forEach((member, index) => {
      html += `<p><strong>Member ${index + 1}:</strong> ${member.name || ""} - ${member.type || ""} - ${member.relationship || ""} - ${member.dateOfBirth || ""}</p>`;
    });
  }

  // Notification Date
  html += '<h2 style="color: #555;">Notification Date</h2>';
  html += `<p><strong>Month:</strong> ${formData.notificationDate?.month || ""}</p>`;
  html += `<p><strong>Year:</strong> ${formData.notificationDate?.year || ""}</p>`;

  html += "</div>";
  return html;
};

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadMergedEmployerPdf = async (
  files: EmployerDocumentFile[],
  filename: string
) => {
  const { bytes, skippedCount } = await mergeEmployerPdfFiles(files);

  const blob = new Blob([bytes as BlobPart], {
    type: "application/pdf",
  });

  downloadBlob(filename, blob);

  return { skippedCount };
};

export const printMergedEmployerPdf = async (
  files: EmployerDocumentFile[],
  formData?: FormData
) => {
  const { bytes, skippedCount } = await mergeEmployerPdfFiles(files);

  const blob = new Blob([bytes as BlobPart], {
    type: "application/pdf",
  });

  const blobUrl = URL.createObjectURL(blob);

  const formHtml = generateFormHtml(formData);

  const printWindow = window.open("", "_blank", "width=1024,height=768");

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Unable to open print window");
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Print Employer Contract</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
          }
          iframe {
            border: 0;
            width: 100%;
            height: 600px;
          }
        </style>
      </head>
      <body>
        ${formHtml}
        <iframe src="${blobUrl}" title="Merged employer forms"></iframe>
      </body>
    </html>
  `);

  printWindow.document.close();

  const iframe = printWindow.document.querySelector("iframe");

  if (!iframe) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Failed to prepare print preview");
  }

  iframe.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
    { once: true }
  );

  return { skippedCount };
};
