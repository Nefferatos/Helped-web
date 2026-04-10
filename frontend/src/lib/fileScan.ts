export type FileScanResult =
  | {
      success: true;
      message: "Valid file";
      file: { name: string; size: number; type: string };
    }
  | {
      success: false;
      message: "Invalid file type";
      file: { name: string; size: number; type: string };
    }
  | {
      success: false;
      message: "No file uploaded";
      file: null;
    };

type AllowedExtension = "doc" | "docx" | "pdf" | "xls" | "xlsx" | "csv";

const DEFAULT_ALLOWED_EXTENSIONS: ReadonlyArray<AllowedExtension> = [
  "doc",
  "docx",
  "pdf",
  "xls",
  "xlsx",
  "csv",
];

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES_BY_EXTENSION: Record<AllowedExtension, ReadonlySet<string>> =
  {
    pdf: new Set(["application/pdf"]),
    doc: new Set(["application/msword"]),
    docx: new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    xls: new Set(["application/vnd.ms-excel"]),
    xlsx: new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
    csv: new Set([
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
    ]),
  };

const CFBF_MAGIC = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_MAGIC_PREFIX = Uint8Array.from([0x50, 0x4b]); // "PK"
const PDF_MAGIC_PREFIX = Uint8Array.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"

const getFileSummary = (file: File) => ({
  name: file.name,
  size: file.size,
  type: file.type,
});

const invalid = (file: File): FileScanResult => ({
  success: false,
  message: "Invalid file type",
  file: getFileSummary(file),
});

const startsWith = (data: Uint8Array, prefix: Uint8Array) => {
  if (data.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (data[i] !== prefix[i]) return false;
  }
  return true;
};

const readBytes = async (file: File, count: number) => {
  const buffer = await file.slice(0, count).arrayBuffer();
  return new Uint8Array(buffer);
};

const getExtension = (name: string): string => {
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot < 0 || dot === trimmed.length - 1) return "";
  return trimmed.slice(dot + 1).toLowerCase();
};

export type ScanUploadedFileOptions = {
  allowedExtensions?: ReadonlyArray<AllowedExtension>;
  maxBytes?: number;
};

// READ-ONLY scanning/validation only: does not save, rename, upload, or transform file content.
export const scanUploadedFile = async (
  file?: File | null,
  options?: ScanUploadedFileOptions
): Promise<FileScanResult> => {
  if (!file) {
    return { success: false, message: "No file uploaded", file: null };
  }

  const name = String(file.name || "");
  const nameLower = name.toLowerCase().trim();

  // Basic suspicious name patterns.
  if (!nameLower || nameLower.includes("\0")) return invalid(file);
  if (nameLower.includes("/") || nameLower.includes("\\")) return invalid(file);
  if (/\.(pdf|docx?|xlsx?|csv)\.[a-z0-9]{1,6}$/i.test(nameLower)) return invalid(file);

  const allowedExtensions = (options?.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS).map(
    (e) => e.toLowerCase()
  );
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  const ext = getExtension(nameLower);
  if (!allowedExtensions.includes(ext)) return invalid(file);

  if (!Number.isFinite(file.size) || file.size <= 0) return invalid(file);
  if (Number.isFinite(maxBytes) && maxBytes > 0 && file.size > maxBytes) return invalid(file);

  // MIME type check (if provided by the browser).
  const mime = String(file.type || "").toLowerCase();
  if (mime && mime !== "application/octet-stream") {
    const allowedMimes =
      ALLOWED_MIME_TYPES_BY_EXTENSION[ext as AllowedExtension] ?? new Set<string>();
    if (!allowedMimes.has(mime)) return invalid(file);
  }

  // Basic file signature validation.
  if (ext === "pdf") {
    const header = await readBytes(file, 4);
    if (!startsWith(header, PDF_MAGIC_PREFIX)) return invalid(file);
    return { success: true, message: "Valid file", file: getFileSummary(file) };
  }

  if (ext === "doc" || ext === "xls") {
    const sample = await readBytes(file, Math.min(512, file.size));
    if (startsWith(sample, CFBF_MAGIC)) {
      return { success: true, message: "Valid file", file: getFileSummary(file) };
    }

    // Some systems export ".xls"/".doc" as HTML/text that Office apps can open.
    // Basic validation: ensure it does not look like binary (no null bytes) and starts with "<" after whitespace.
    let i = 0;
    while (i < sample.length && (sample[i] === 0x09 || sample[i] === 0x0a || sample[i] === 0x0d || sample[i] === 0x20)) {
      i += 1;
    }
    for (const byte of sample) {
      if (byte === 0x00) return invalid(file);
    }
    if (i >= sample.length) return invalid(file);
    if (sample[i] !== 0x3c /* "<" */) return invalid(file);
    return { success: true, message: "Valid file", file: getFileSummary(file) };
  }

  if (ext === "docx" || ext === "xlsx") {
    const header = await readBytes(file, 2);
    if (!startsWith(header, ZIP_MAGIC_PREFIX)) return invalid(file);
    return { success: true, message: "Valid file", file: getFileSummary(file) };
  }

  // CSV: must look like text (basic binary/null-byte check).
  if (ext === "csv") {
    const chunk = await readBytes(file, Math.min(1024, file.size));
    for (const byte of chunk) {
      if (byte === 0x00) return invalid(file);
    }
    return { success: true, message: "Valid file", file: getFileSummary(file) };
  }

  return invalid(file);
};
