const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const table = process.env.SUPABASE_APP_DATA_TABLE?.trim() || "app_data";
const rowId = process.env.SUPABASE_APP_DATA_ID?.trim() || "default";

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  accept: "application/json",
};

const rowUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(
  rowId,
)}&select=id,data,updated_at&limit=1`;

const isInlineDataUrl = (value) =>
  typeof value === "string" && value.startsWith("data:");

const response = await fetch(rowUrl, { headers });
if (!response.ok) {
  throw new Error(`Failed to load app_data row: ${response.status} ${await response.text()}`);
}

const rows = await response.json();
const row = rows[0];

if (!row?.data) {
  throw new Error("No app_data row found to clean.");
}

const documentsByApplication = row.data?.ats?.documents;
if (!documentsByApplication || typeof documentsByApplication !== "object") {
  console.log("No ATS documents found.");
  process.exit(0);
}

let removedCount = 0;

for (const documents of Object.values(documentsByApplication)) {
  if (!Array.isArray(documents)) continue;
  for (const document of documents) {
    if (!document || typeof document !== "object") continue;
    if (isInlineDataUrl(document.url)) {
      document.url = "";
      removedCount += 1;
    }
  }
}

if (removedCount === 0) {
  console.log("No inline ATS document data URLs found.");
  process.exit(0);
}

const updateUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(
  rowId,
)}&select=updated_at`;

const updateResponse = await fetch(updateUrl, {
  method: "PATCH",
  headers: {
    ...headers,
    "content-type": "application/json",
    prefer: "return=representation",
  },
  body: JSON.stringify({
    data: row.data,
  }),
});

if (!updateResponse.ok) {
  throw new Error(`Failed to update app_data row: ${updateResponse.status} ${await updateResponse.text()}`);
}

console.log(`Removed ${removedCount} inline ATS document data URLs from ${table}.${rowId}.`);
