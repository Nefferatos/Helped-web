# Google Sheets Agency Reports

The agency portal can push **every data category it holds into a Google
Spreadsheet**, with **one dedicated tab per category** — maids, enquiries,
requests, contracts, applicants and chat messages are never blended into a
single shared sheet.

- **UI:** agency portal sidebar → **Reports** (`/agencyadmin/reports`)
- **Worker routes:** `/api/reports/*` (all require agency-admin auth)
- **Report definitions:** `functions/api/services/agencyReports.ts`
- **Google Sheets client:** `functions/api/services/googleSheets.ts`

---

## 1. One-time Google setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create
   or select a project.
2. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**. No project role
   is required (access is granted per-spreadsheet in step 5).
4. Open the new service account → **Keys → Add key → Create new key → JSON**.
   Download the JSON file.
5. Create (or open) the Google Spreadsheet you want to write to, click **Share**,
   and add the service account's `client_email` (e.g.
   `reports@my-project.iam.gserviceaccount.com`) as an **Editor**.

> **Skipping step 5 is the most common failure.** Without it every write returns
> HTTP 403 `PERMISSION_DENIED`, which the Worker surfaces as
> "Google Sheets access denied (403) … Share the spreadsheet with the service
> account email as an Editor."

---

## 2. Configure the Worker

```bash
# Secret — contains an RSA private key, never commit it
npx wrangler secret put GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
# Paste the ENTIRE key JSON when prompted

# Default spreadsheet — id or full URL
npx wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
```

For local development add the same two entries to `.dev.vars` (see
`.dev.vars.example`). The service-account JSON must be on **one line** with
newlines escaped as `\n`.

`GOOGLE_SHEETS_SPREADSHEET_ID` is only a **default**. Each agency can save its
own spreadsheet id/URL on the Reports page; that per-agency value wins. The page
shows which source is in effect (`agency` vs `worker`).

---

## 3. Using the Reports page

1. Open **Reports** in the agency portal sidebar.
2. The connection panel shows whether the service account is configured, which
   email to share the sheet with, and the effective spreadsheet id.
3. Optionally paste a spreadsheet id or URL for **this agency only**, then
   **Save settings**.
4. **Test connection** verifies credentials and reports how many tabs the target
   spreadsheet already has.
5. Choose what to export:
   - **All data** — every category, each on its own tab.
   - **Selected only** — tick the categories you want.
6. **Push report to Google Sheets**. The result panel lists every tab written and
   its row count, plus a link to open the spreadsheet.

---

## 4. What gets written

Each section below maps to exactly one tab. Order matches the tab order.

| Group | Tab | Scope | Notes |
|---|---|---|---|
| Agency Profile | `Agency Profile` | agency-wide | Company registration, contact, branding, socials |
| Agency Profile | `MOM Personnel` | agency-wide | Names + MOM registration numbers |
| Agency Profile | `Testimonials` | agency-wide | Micro-site testimonials |
| Agency Profile | `Agency Staff Accounts` | **by agencyId** | Portal logins — passwords/hashes excluded |
| Maids | `Maids` | **by agencyId** | Full helper profiles |
| Leads | `Enquiries` | by agencyId (incl. unassigned) | Matched client id/name resolved like the inbox |
| Leads | `Clients` | agency-wide | Employer accounts — passwords/hashes excluded |
| Leads | `Direct Sales` | agency-wide | Direct-sale leads per helper |
| Requests | `Requests` | **by agencyId** | Hiring requests |
| Requests | `Request Conversations` | **by agencyId** | Thread metadata + message counts |
| Requests | `Request Messages` | via conversation | Scoped through the parent conversation |
| Messages | `Chat Messages` | by agencyId | Support chat between employers and agency |
| Contracts | `Employers` | agency-wide | Employer records for MOM/contract docs |
| Contracts | `Employment Contracts` | agency-wide | Fees, case references, witnesses |
| Applicants | `ATS Applications` | **by agencyId** | Access tokens excluded |
| Applicants | `ATS Applicant Profiles` | **by agencyId** | Full biodata |
| Applicants | `ATS Scores` | **by agencyId** | AI qualification breakdown |
| Applicants | `ATS Stage History` | **by agencyId** | Stage-change audit trail |
| Applicants | `ATS Documents` | **by agencyId** | Uploads + verification status |
| Applicants | `ATS Notifications` | **by agencyId** | Email/WhatsApp/internal log |
| Applicants | `ATS Filter Presets` | **by agencyId** | Saved list filters |
| Integrations | `TikTok Integration` | agency-wide | Connected account — tokens excluded |

**Secrets are never exported.** Passwords, password hashes, session tokens, email
verification hashes, ATS applicant access tokens and TikTok access/refresh
tokens are deliberately omitted.

---

## 5. Write behaviour

Per selected tab the Worker:

1. **Creates the tab** if it does not exist. Existing tabs are reused, and titles
   are sanitised (Google rejects `[]:*?/\`, blanks and >100 chars) and made
   unique.
2. **Clears the tab**, so a report with fewer rows than the previous run never
   leaves stale trailing rows behind.
3. **Writes** the header row + data rows in batches of 1 000 rows.

Tabs are **never deleted**, so unrelated tabs you keep in the same spreadsheet
are safe.

Cell normalisation: objects/arrays are JSON-stringified, base64 data URLs become
`[binary attachment]`, newlines are flattened, and any cell over 50 000
characters is truncated with a `… [truncated]` marker.

A section that throws while building (e.g. a malformed legacy record) is
**skipped**, not fatal — the response lists it under `skippedSectionIds` and the
UI shows it, while the rest of the report still lands.

---

## 6. API reference

All routes require the agency-admin `Authorization: Bearer <token>` header.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports/status` | Connection + config readiness (never returns the private key) |
| `GET` | `/api/reports/sections` | Catalogue of exportable categories |
| `PUT` | `/api/reports/config` | Save this agency's spreadsheet target + section picks |
| `POST` | `/api/reports/google-sheet/test` | Verify credentials and spreadsheet access |
| `POST` | `/api/reports/google-sheet` | Push the report |

`PUT /api/reports/config` body:

```json
{
  "spreadsheetIdOrUrl": "https://docs.google.com/spreadsheets/d/1AbC.../edit",
  "includedSectionIds": ["maids", "enquiries"]
}
```

An **empty `includedSectionIds` array means "export every section"**.

Config is persisted per agency under
`companyProfile.googleSheetReportConfigs[<agencyId>]` — the same pattern the
chatbot config uses — so two agencies never share a spreadsheet target or a
section selection.

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| 403 `PERMISSION_DENIED` | Spreadsheet not shared with the service-account email as Editor (setup step 5) |
| 404 `NOT_FOUND` | Wrong spreadsheet id — check `GOOGLE_SHEETS_SPREADSHEET_ID` or the value saved on the Reports page |
| "…is not a valid service account key JSON" | Secret missing/truncated. Re-run `npx wrangler secret put GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` and paste the whole file |
| `invalid_grant` on token exchange | Server clock skew, or the key was revoked/regenerated in Google Cloud |
| "Could not read a spreadsheet id from that value" | Pasted something that is neither a bare id nor a `/spreadsheets/d/<id>/` URL |

---

## 8. Adding a new data category

Add one entry to `AGENCY_REPORT_SECTIONS` in
`functions/api/services/agencyReports.ts`:

```ts
{
  id: "myNewCategory",            // stable id used by the per-agency config
  title: "My New Category",       // becomes the Google Sheet tab title
  group: "Leads",                 // UI grouping label
  description: "What this tab contains.",
  headers: ["Column A", "Column B"],
  build: ({ data, agencyId }) =>
    scopedToAgency(data.myNewCategory ?? [], agencyId).map((row) => [
      str(row.a),
      num(row.b),
    ]),
}
```

Use `scopedToAgency(...)` whenever the records carry an `agencyId`. The section
then appears automatically on the Reports page — no frontend change needed,
since the catalogue is served by `GET /api/reports/sections`.

---

## 9. Local development

The Vite dev server proxies `/api` to the Express backend on port 3000, but the
report routes live in the **Cloudflare Worker**. Add a Worker-scoped proxy entry
so `/agencyadmin/reports` works locally (already configured in
`frontend/vite.config.ts`):

```ts
"/api/reports": {
  target: workerApiProxyTarget,   // http://127.0.0.1:8787
  changeOrigin: true,
},
```

Then run `npm run worker:dev` alongside `npm run dev`.
