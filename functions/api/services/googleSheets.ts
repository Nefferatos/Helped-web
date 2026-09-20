/**
 * Google Sheets API client for Cloudflare Workers.
 *
 * Authentication uses a Google **service account** key (the JSON file you
 * download from Google Cloud -> IAM & Admin -> Service Accounts -> Keys).
 * The Worker signs a short-lived JWT with the service account's RSA private
 * key using the Web Crypto API (`crypto.subtle`) and exchanges it for an
 * access token at Google's OAuth endpoint. No `googleapis` npm dependency is
 * used — that package pulls in Node-only modules that cannot run on Workers.
 *
 * Setup (one-time):
 *   1. Google Cloud Console -> create/select a project -> enable the
 *      "Google Sheets API".
 *   2. IAM & Admin -> Service Accounts -> Create service account -> Keys ->
 *      Add key -> JSON. Download the JSON file.
 *   3. Create (or open) the target Google Spreadsheet and **share it with the
 *      service account's `client_email`** as an *Editor*. Without this step
 *      every write returns HTTP 403 PERMISSION_DENIED.
 *   4. Store the JSON as a Worker secret and the spreadsheet id/url as a var:
 *        npx wrangler secret put GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
 *        npx wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
 */

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** Hard limits enforced by the Google Sheets API. */
const MAX_SHEET_TITLE_LENGTH = 100;
const MAX_CELL_LENGTH = 50_000;
/** Rows written per `values:batchUpdate` call. Keeps payloads well under limits. */
const ROWS_PER_WRITE_BATCH = 1_000;

export type GoogleServiceAccountKey = {
  type?: string;
  project_id?: string;
  private_key?: string;
  private_key_id?: string;
  client_email?: string;
  client_id?: string;
  token_uri?: string;
};

export type GoogleSheetsCredentials = {
  serviceAccount: GoogleServiceAccountKey;
  spreadsheetId: string;
};

export type GoogleSheetValues = Array<Array<string | number | boolean | null>>;

export type GoogleSheetTabWrite = {
  /** Requested tab title; sanitized + made unique before writing. */
  title: string;
  /** Header row followed by data rows. */
  values: GoogleSheetValues;
};

export type GoogleSheetsWriteResult = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabsWritten: number;
  rowsWritten: number;
  tabs: Array<{ title: string; rows: number }>;
};

export type GoogleSpreadsheetSheet = {
  properties?: {
    sheetId?: number;
    title?: string;
    index?: number;
  };
};

/* ─── Base64url / PEM helpers ─────────────────────────────────────────────── */

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const base64Url = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const base64UrlFromBytes = (bytes: Uint8Array) => base64Url(bytesToBase64(bytes));

const base64UrlFromString = (value: string) =>
  base64Url(bytesToBase64(new TextEncoder().encode(value)));

/** Strip PEM armor and decode the DER body into bytes. */
const pemToDerBytes = (pem: string): Uint8Array => {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/[\r\n\s]/g, "");

  if (!body) {
    throw new Error("Google service account private_key is empty");
  }

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};


/* ─── Credentials parsing ─────────────────────────────────────────────────── */

/**
 * Accepts either the raw JSON string of a service account key file or an
 * already-parsed object. Returns `null` when nothing usable was supplied so
 * callers can report "not configured" instead of throwing.
 */
export const parseGoogleServiceAccount = (
  raw: unknown,
): GoogleServiceAccountKey | null => {
  if (!raw) return null;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const key = parsed as GoogleServiceAccountKey;
  if (!key.client_email?.trim() || !key.private_key?.trim()) return null;
  return key;
};

/**
 * Accepts a bare spreadsheet id or any Google Sheets URL and returns the id.
 *   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0  ->  <ID>
 */
export const extractSpreadsheetId = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl?.[1]) return fromUrl[1];

  // A bare id never contains a slash or a dot (URLs do).
  if (!raw.includes("/") && !raw.includes(".")) return raw;
  return "";
};

export const buildSpreadsheetUrl = (spreadsheetId: string) =>
  `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`;

type GoogleSheetsEnv = {
  GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID?: string;
};

/**
 * Combines the Worker-level service account secret with a spreadsheet id that
 * may come either from the Worker var or from the agency's saved report config.
 */
export const resolveGoogleSheetsCredentials = (
  env: GoogleSheetsEnv,
  spreadsheetIdOverride?: string,
): { credentials: GoogleSheetsCredentials | null; reason?: string } => {
  const serviceAccount = parseGoogleServiceAccount(
    env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON,
  );
  if (!serviceAccount) {
    return {
      credentials: null,
      reason:
        "GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON is not set or is not a valid service account key JSON",
    };
  }

  const spreadsheetId =
    extractSpreadsheetId(spreadsheetIdOverride) ||
    extractSpreadsheetId(env.GOOGLE_SHEETS_SPREADSHEET_ID);
  if (!spreadsheetId) {
    return {
      credentials: null,
      reason:
        "No spreadsheet configured. Set GOOGLE_SHEETS_SPREADSHEET_ID or save a spreadsheet id/url on the Reports page.",
    };
  }

  return { credentials: { serviceAccount, spreadsheetId } };
};

/* ─── OAuth: signed JWT -> access token ───────────────────────────────────── */

const signRs256 = async (
  privateKeyPem: string,
  signingInput: string,
): Promise<string> => {
  const derBytes = pemToDerBytes(privateKeyPem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    derBytes as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput) as unknown as ArrayBuffer,
  );

  return base64UrlFromBytes(new Uint8Array(signature));
};

const buildServiceAccountJwt = (serviceAccount: GoogleServiceAccountKey) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlFromString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlFromString(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SHEETS_SCOPE,
      aud: serviceAccount.token_uri?.trim() || OAUTH_TOKEN_URL,
      iat: issuedAt,
      // Google rejects lifetimes longer than one hour.
      exp: issuedAt + 3_600,
    }),
  );
  return `${header}.${claims}`;
};

const readGoogleError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as {
      error?: string | { message?: string };
      error_description?: string;
    };
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : parsed.error?.message ?? parsed.error_description;
    if (message) return message;
  } catch {
    // fall through to raw text
  }
  return text.trim() || response.statusText || "Google API request failed";
};

/** Exchange the service account JWT for a Sheets access token. */
export const getGoogleSheetsAccessToken = async (
  serviceAccount: GoogleServiceAccountKey,
): Promise<string> => {
  const signingInput = buildServiceAccountJwt(serviceAccount);
  const signature = await signRs256(serviceAccount.private_key ?? "", signingInput);
  const assertion = `${signingInput}.${signature}`;

  const response = await fetch(
    serviceAccount.token_uri?.trim() || OAUTH_TOKEN_URL,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    },
  );

  if (!response.ok) {
    const details = await readGoogleError(response);
    throw new Error(
      `Google OAuth token exchange failed (${response.status}): ${details}`,
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google OAuth response did not include an access_token");
  }
  return payload.access_token;
};

const sheetsFetch = async (
  accessToken: string,
  url: string,
  init: RequestInit = {},
) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await readGoogleError(response);
    if (response.status === 403) {
      throw new Error(
        `Google Sheets access denied (403): ${details}. Share the spreadsheet with the service account email as an Editor.`,
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Google Spreadsheet not found (404): ${details}. Check the spreadsheet id on the Reports page.`,
      );
    }
    throw new Error(`Google Sheets request failed (${response.status}): ${details}`);
  }

  return response;
};

/* ─── Spreadsheet reads ───────────────────────────────────────────────────── */

/** Token-aware title read; reuses one OAuth token across all calls. */
const readSheetTitles = async (
  accessToken: string,
  spreadsheetId: string,
): Promise<string[]> => {
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`;
  const response = await sheetsFetch(accessToken, url, { method: "GET" });
  const payload = (await response.json()) as {
    sheets?: GoogleSpreadsheetSheet[];
  };
  return (payload.sheets ?? [])
    .map((sheet) => sheet.properties?.title ?? "")
    .filter(Boolean);
};

/** Returns the titles of every tab that already exists in the spreadsheet. */
export const listSpreadsheetSheetTitles = async (
  credentials: GoogleSheetsCredentials,
): Promise<string[]> => {
  const accessToken = await getGoogleSheetsAccessToken(credentials.serviceAccount);
  return readSheetTitles(accessToken, credentials.spreadsheetId);
};

/* ─── Sheet-title sanitising ──────────────────────────────────────────────── */

const ILLEGAL_SHEET_TITLE_CHARS = /[[\]:*?/\\]+/g;

/**
 * Google rejects tab titles that are empty, longer than 100 chars, contain
 * `[]:*?/\`, or duplicate an existing title. This normalises a requested
 * title and guarantees uniqueness against `existingTitles`.
 */
export const sanitizeSheetTitle = (
  requested: string,
  existingTitles: Set<string>,
): string => {
  let title = String(requested ?? "")
    .replace(ILLEGAL_SHEET_TITLE_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) title = "Sheet";
  if (title.length > MAX_SHEET_TITLE_LENGTH) {
    title = title.slice(0, MAX_SHEET_TITLE_LENGTH).trim();
  }

  let unique = title;
  let suffix = 2;
  while (existingTitles.has(unique)) {
    const marker = ` (${suffix})`;
    unique = `${title.slice(0, MAX_SHEET_TITLE_LENGTH - marker.length)}${marker}`;
    suffix += 1;
  }
  existingTitles.add(unique);
  return unique;
};

/* ─── Cell normalisation ──────────────────────────────────────────────────── */

/**
 * Sheets stores cell values as strings, numbers or booleans. Objects/arrays
 * are JSON-stringified, data URLs and other oversized blobs are replaced with
 * a short marker so a single record can never blow past the 50 000-char cell
 * limit or the request size limit.
 */
export const toSheetCellValue = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";

  let text: string;
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value) ?? "";
    } catch {
      text = String(value);
    }
  }

  // Media payloads are useless in a spreadsheet and enormous.
  if (/^data:[^;]+;base64,/i.test(text.trim())) {
    return "[binary attachment]";
  }

  text = text.replace(/\r?\n/g, " ").trim();
  if (text.length > MAX_CELL_LENGTH) {
    text = `${text.slice(0, MAX_CELL_LENGTH - 15)}… [truncated]`;
  }
  return text;
};

/* ─── Writes ──────────────────────────────────────────────────────────────── */

/** A1 notation for a whole tab, quoted so titles with spaces stay valid. */
const wholeSheetRange = (title: string) => `'${title.replace(/'/g, "''")}'`;

const chunkRows = (rows: GoogleSheetValues) => {
  const chunks: GoogleSheetValues[] = [];
  for (let index = 0; index < rows.length; index += ROWS_PER_WRITE_BATCH) {
    chunks.push(rows.slice(index, index + ROWS_PER_WRITE_BATCH));
  }
  return chunks.length > 0 ? chunks : [[]];
};

/**
 * Writes every tab in `tabs` to the configured spreadsheet.
 *
 * Per tab this:
 *   1. creates the tab when it does not exist yet (existing tabs are reused),
 *   2. clears the tab so a shorter new report never leaves stale rows behind,
 *   3. writes the header row + data rows in row-chunked batches.
 *
 * Tabs are never deleted, so unrelated tabs in the same spreadsheet are safe.
 */
export const writeGoogleSheetsTabs = async (
  credentials: GoogleSheetsCredentials,
  tabs: GoogleSheetTabWrite[],
): Promise<GoogleSheetsWriteResult> => {
  const accessToken = await getGoogleSheetsAccessToken(credentials.serviceAccount);
  const spreadsheetId = credentials.spreadsheetId;

  const liveTitles = await readSheetTitles(accessToken, spreadsheetId);
  const liveTitleSet = new Set(liveTitles);
  // Starts EMPTY on purpose: a section whose tab already exists must keep its
  // exact name so it is refreshed in place instead of spawning "Maids (2)".
  // sanitizeSheetTitle adds each planned title as it goes, which is what stops
  // two sections in the same run from colliding with each other.
  const titleReservation = new Set<string>();

  const planned = tabs.map((tab) => ({
    title: sanitizeSheetTitle(tab.title, titleReservation),
    values: tab.values.map((row) => row.map(toSheetCellValue)),
  }));

  const titlesToCreate = planned
    .map((tab) => tab.title)
    .filter((title) => !liveTitleSet.has(title));

  if (titlesToCreate.length > 0) {
    await sheetsFetch(
      accessToken,
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: titlesToCreate.map((title) => ({
            addSheet: { properties: { title } },
          })),
        }),
      },
    );
  }

  // Clear first: a report with fewer rows than the previous run must not leave
  // the old trailing rows visible.
  await sheetsFetch(
    accessToken,
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:clear`,
    {
      method: "POST",
      body: JSON.stringify({
        ranges: planned.map((tab) => wholeSheetRange(tab.title)),
      }),
    },
  );

  let rowsWritten = 0;
  for (const tab of planned) {
    const chunks = chunkRows(tab.values);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      if (chunk.length === 0) continue;
      // The header lives in chunk 0; later chunks continue on the next free row.
      const startRow = index === 0 ? 1 : index * ROWS_PER_WRITE_BATCH + 1;
      const endRow = startRow + chunk.length - 1;
      const range = `${wholeSheetRange(tab.title)}!A${startRow}:A${endRow}`;

      await sheetsFetch(
        accessToken,
        `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: [{ range, values: chunk }],
          }),
        },
      );
      rowsWritten += chunk.length;
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl: buildSpreadsheetUrl(spreadsheetId),
    tabsWritten: planned.length,
    rowsWritten,
    tabs: planned.map((tab) => ({
      title: tab.title,
      // Subtract the header row so the UI reports record counts.
      rows: Math.max(0, tab.values.length - 1),
    })),
  };
};

/** Connectivity probe used by the Reports page "Test connection" button. */
export const testGoogleSheetsConnection = async (
  credentials: GoogleSheetsCredentials,
): Promise<{ ok: true; spreadsheetId: string; existingTabs: string[] }> => {
  const existingTabs = await listSpreadsheetSheetTitles(credentials);
  return { ok: true, spreadsheetId: credentials.spreadsheetId, existingTabs };
};

