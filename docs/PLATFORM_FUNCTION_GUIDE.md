# Helped Platform — Full Function Guide

### (with a dedicated Agency Portal playbook — "what to do, step by step")

**Document type:** Internal operating + technical reference
**Audience:** Agency owner / boss (Part 1–5), office staff using the agency portal (Part 5), developer or IT support (Part 6–10)
**Applies to:** `c:\hh\Helped-web` — live Cloudflare Worker named `findmaid`, front-end served from `frontend/dist`

> **How to read this note**
> - If you are the **boss / owner** → read **Part 1** (what the system is), then **Part 5** (the Agency Portal, which is *your* control room). Part 9 tells you what to do when something fails.
> - If you are **office staff** → **Part 5.3 – 5.14** is your day-to-day manual.
> - If you are the **developer / IT** → **Part 6** lists every function file-by-file, **Part 7–8** covers data and secrets.

### Contents

1. **Part 1** — What this system is (plain English) + the tech stack + folder map
2. **Part 2** — How to run it and how to update the live website (`npm run deploy:cf`)
3. **Part 3** — Public website functions (every visitor-facing page)
4. **Part 4** — Employer (Client) Portal functions
5. **Part 5** — **THE AGENCY PORTAL**: login/verification, the 17 sidebar buttons, and step-by-step playbooks for helpers, requests, enquiries, messages, contracts, applicants, operations, reports, AI tools, plus a daily/monthly checklist
6. **Part 6** — Every function, file by file: front-end pages/components/hooks/libs, every API endpoint, every controller, service, store, repository, the Cloudflare Worker and the scripts
7. **Part 7** — Data, storage and database (Supabase / KV / Storage buckets)
8. **Part 8** — Environment variables and secrets
9. **Part 9** — What to do when something fails (runbook)
10. **Part 10** — Related documents, glossary and document control


---

## Part 1 — What this system is (plain English)

Helped (= the "Find Maid" website) is **one website that runs four different "doors"** for four different types of people, plus a set of AI automations that work in the background.

| Door | Who uses it | Public URL | What it is for |
|---|---|---|---|
| **Public website** | Anyone (employers, helpers) | `/`, `/search-maids`, `/about`, `/faq`, `/enquiry2`, `/services/:slug` | Marketing site: browse helpers, read about the agency, send an enquiry, read FAQ |
| **Agency Portal (back office)** | **Agency owner + staff (your team)** | `/agency` → logs you in, then everything lives under `/agencyadmin/...` | The control room: add/manage helpers, handle employer requests and enquiries, chat, contracts, applicants, reports, AI tools |
| **Employer (Client) Portal** | Employers / clients | `/employer-login` → `/client/...` | Employers log in to search helpers, track their request, chat with the agency, manage profile |
| **Agency directory (public)** | Job seekers + public | `/agency-portal`, `/agencies`, `/agencies/:id` | Public list of agencies and each agency's micro-site |
| **Helper application (public)** | Maid / helper applicants | `/apply-as-maid`, `/apply-as-maid/status/:applicationId` | A helper fills in an application form and can check its status |
| **Shared helper page** | Employer + helper | `/maids/:refCode`, `/hire/:refCode` | A single helper's public profile, or the hire/hiring-process page |

**In one sentence:** the website attracts employers → they send enquiries and hiring requests → the agency portal turns those into placements → AI agents help with screening, ranking, documents, marketing and reports.

### 1.1 The moving parts (tech, in one table)

| Layer | Technology | Where |
|---|---|---|
| Website (what people see) | React 18 + TypeScript + Vite + Tailwind + shadcn/Radix components | `frontend/src` |
| Live server / API | Cloudflare Worker (Hono router) + Pages Functions | `functions/api/[[...path]].ts` |
| Local/dev API (optional) | Node.js + Express + TypeScript | `backend/src` |
| Database + file storage | Supabase (Postgres `app_data` blob **or** normalized tables + Storage buckets) | `supabase/*.sql`, `backend/src/db.ts`, `functions/api/[[...path]].ts` |
| Optional KV storage | Cloudflare KV namespace `APP_DATA` (used only when `STORAGE_BACKEND=kv`) | `wrangler.toml` |
| Email | Resend (6-digit signup confirmation codes) | Worker secrets |
| AI / documents / socials | Make.com scenarios + Anthropic Claude / OpenAI-compatible / Gemini / Groq | `make/*.blueprint.json`, `functions/api/services/ai/*` |
| Reports | Google Sheets API (one tab per data category) | `functions/api/services/agencyReports.ts` + `googleSheets.ts` |
| Background jobs | Cloudflare cron `*/30 * * * *` (every 30 min) → AI autopilot | `wrangler.toml` `[triggers]` |

### 1.2 Folder map (what lives where)

```
frontend/        React website + agency portal + employer portal (all screens)
backend/         Node/Express API (local dev + SQL jobs) and the JSON data store
functions/api/   The LIVE API: one Cloudflare Worker file (14k+ lines) + its services
supabase/        SQL to create/repair the database (run in Supabase SQL editor)
make/            Make.com scenario blueprints (AI receptionist, HR interviewer, PDF autofill, …)
scripts/         Test + deploy + maintenance scripts (run with npm run …)
docs/            Guides — including this one
wrangler.toml    Cloudflare Worker config (name, storage backend, cron, vars)
.env / .dev.vars Local secrets (never committed)
```

---

## Part 2 — How to run it and how to update the live site

### 2.1 Install (once per computer)

```bash
npm run install-all        # installs root + frontend + backend dependencies
```

### 2.2 Run it locally (all servers at once)

```bash
npm run dev                # Express API (3000) + Vite website (5173) + Worker (8787)
npm run worker:dev         # Worker only (builds frontend in dev mode first) — test the real API
```
Open `http://localhost:5173` in a browser.

### 2.3 Update the LIVE website (the command that matters for the boss)

```bash
npm run deploy:cf
```
That single command: builds the front end → deploys the Worker code → uploads the static files.
Data is **not** reset by a deploy (it lives in Supabase / KV, not in the code).

### 2.4 Build / test / safety commands

| Command | What it does |
|---|---|
| `npm run build` | Build the front end for production |
| `npm run build:full` | Build back end + front end |
| `cd frontend; npm run test` | Front-end unit tests (Vitest) |
| `cd frontend; npm run lint` | Front-end code style check |
| `cd backend; npm run lint` | Back-end code style check |
| `npm run secrets:scan` | Blocks commits that contain real secret values |
| `npm run test:ai` | AI integration tests (`:local` and `:prod` variants exist) |
| `npm run test:website-ai` / `test:hr-email` / `test:hr-full` / `test:orchestrator` / `test:events` / `test:make-webhook` | Feature smoke tests (each needs `.env`) |

### 2.5 Where the live data lives

- `wrangler.toml` sets `STORAGE_BACKEND = "supabase"` → app data is in Supabase.
- Agency logins can be collapsed into the normalized table `helped_agency_admins` by setting `SUPABASE_USE_NORMALIZED = "true"`. **Migrate first or every admin is locked out** (the warning is written in `wrangler.toml`).
- `GET /api/diagnostics` (agency-admin login required) reports the live storage mode: `storage: "supabase"` / `"supabase-normalized"` and `supabase.normalized: true|false`.
- There is a **30-minute Cloudflare cron** that runs the AI autopilot when `AI_AUTOPILOT_ENABLED = "true"` (it proposes actions for review instead of sending customer-facing messages by itself).

---

## Part 3 — Public website functions (what a visitor sees)

| Route | Screen (file) | What it does |
|---|---|---|
| `/` | `ClientHomeRedirect` → `ClientLandingPage` | Landing page. If the visitor is already logged in to the employer portal, it redirects to `/client/home` |
| `/search-maids` | `ClientMaidsPage` | Public helper search (filters: nationality, skills, salary, experience…). Result links land on `/search-maids/results` |
| `/search-maids/results` | `MaidSearchPage` | Search results grid with shortlist, compare, send-to-friend |
| `/maids/:refCode` | `PublicMaidProfile` | Shareable helper profile (single maid) |
| `/hire/:refCode` | `HiringProcessPage` | Public hiring process / start-hire page for one helper |
| `/agencies` | `AgenciesPage` | Public list of agencies |
| `/agencies/:id` | `AgencyDetailsPage` | One agency's public micro-site + its helpers |
| `/agency-portal` , `/agencyportal` | `AgenciesPage` | Same public agency directory (friendly URL) |
| `/apply-as-maid` | `PublicMaidApplicationPage` | Helper (applicant) application form — uploads CV/documents, creates an ATS application |
| `/apply-as-maid/status/:applicationId` | `PublicMaidApplicationStatusPage` | Applicant checks their own application status with their access token |
| `/enquiry2` | `Enquiry` | Public enquiry form (goes into the agency's Enquiries inbox) |
| `/about` | `AboutUs` | About page |
| `/faq` | `FAQPage` | Frequently asked questions |
| `/services/:slug` | `ServiceDetails` | One service page (infant care, elderly care, housekeeping…) |
| `/privacy-policy`, `/terms-of-service`, `/data-deletion` | `PrivacyPolicy`, `TermsOfService`, `DataDeletion` | Legal / compliance pages (needed for Facebook & TikTok app review) |
| `/employer-login` | `ClientEmployerLogin` | Employer login: email+password, **Google**, **Facebook**, or **phone OTP** |
| `/auth/callback`, `/auth/tiktok/callback` | `AuthCallback`, `TikTokCallback` | OAuth return handlers |
| any other URL | `NotFound` | 404 page |
| floating widget on every page | `PublicAiReceptionist` | The AI receptionist bubble (appears after 3 s; hidden on support chat, employer login and the maid-application pages) |

### 3.1 Enquiry intake (structured enquiry system)

- Public form: `frontend/src/ClientPage/Enquiry.tsx` and `frontend/src/components/EnquiryIntakeForm.tsx` (page `EnquiryIntakePage.tsx`).
- The back end parses free text into structured data with `backend/src/lib/enquiryExtractor.ts` → `extractEnquiry(text)` and can push it into a support conversation with `enquiryToSupportIntegration.ts`.
- API: `POST /api/enquiries/extract` (parse text), `POST /api/enquiries` (create), `GET /api/enquiries` (list), `PATCH /api/enquiries/:id`, `DELETE /api/enquiries/:id`, plus unread-count / mark-viewed / stream endpoints used by the portal badge.
- Read more: `docs/ENQUIRY_INTAKE_SYSTEM.md`, `ENQUIRY_QUICK_REFERENCE.md`, `ENQUIRY_SYSTEM_IMPLEMENTATION.md`.

---

## Part 4 — Employer (Client) Portal functions

Entry: `/employer-login` (password, Google, Facebook or phone OTP) → `/client/home`.

| Route | Screen | What the employer can do |
|---|---|---|
| `/client/home` | `ClientPortalHome` | Summary tiles: my requests, my shortlist, new messages |
| `/client/maids` | `ClientMaidsPage` | Browse helpers inside the portal |
| `/client/maids/search` | `MaidSearchPage` | Search + shortlist helpers |
| `/client/requests` | `ClientRequestsPage` | See every hiring request and its status |
| `/client/enquiry` | `Enquiry` | Send an enquiry |
| `/client/support-chat` | `ClientSupportChat` | Live chat with the agency (Realtime/SSE stream) |
| `/client/messages` | → redirects to `support-chat` | – |
| `/client/profile` | `ClientProfilePage` | Edit own profile / contact details |
| `/client/change-password` | `ClientChangePasswordPage` | Change password |
| `/client/dashboard`, `/client/history` | `ClientDashboard`, → `/client/profile` | Legacy dashboard / history |
| `/client/faq`, `/client/about` | `FAQPage`, `AboutUs` | Information pages inside the portal |
| `/client/ai-assistant` | → redirects to `home` | – |

**Client (employer) API:** `POST /api/client-auth/register` · `/confirm` · `/resend` · `/login` · `GET|PUT /api/client-auth/me` · `POST /api/client-auth/logout`; `GET /api/client/my-maids` (helpers assigned to me) · `GET /api/client/history` · `PATCH /api/client/direct-sales/:id/interested` · `/direct-hire` · `/reject` (the employer's answer to a helper the agency proposed).
Signup is protected by a 6-digit email code (Resend) exactly like the agency signup.

---

## Part 5 — THE AGENCY PORTAL (your control room)

### 5.1 Signing in and creating accounts

| Step | What happens | Where |
|---|---|---|
| 1 | Open **`/agency`** (the Login / "Agency Portal" page) | `frontend/src/ClientPage/AgencyPortal.tsx` |
| 2 | Type **username + password** → `POST /api/agency-auth/login` | Token saved in the browser, you land on `/agencyadmin/dashboard` |
| 3 | If the account's e-mail is **not yet verified** the API answers `403 requiresConfirmation` and the page swaps to a **6-digit code** screen → `POST /api/agency-auth/confirm` | Code is valid **15 minutes**; "Resend code" → `/api/agency-auth/resend` |
| 4 | Optional "remember me" behaviour: the welcome tour is shown once per account (`shouldShowAgencyAdminWelcome` / `markAgencyAdminWelcomeShown`) | `frontend/src/lib/agencyAdminAuth.ts` |
| 5 | Every admin page is wrapped in `ProtectedAdminRoute`: it calls `GET /api/agency-auth/me` on load and immediately kicks you to the login page if the session is dead | `frontend/src/App.tsx` |

**Creating a new agency account:** the public login page only signs you in — it does not self-register. Accounts are created through the API:
`POST /api/agency-auth/register` with `{ username, email, password, agencyName }` (the e-mail receives the 6-digit code), or an existing administrator adds a colleague with `POST /api/agency-auth/admins`.
There is also a recovery endpoint in the Worker: `POST /api/agency-auth/bootstrap-reset` (use only with the developer — it resets an administrator login).

**Passwords:** change your own password in **Security** → `POST /api/agency-auth/change-password` (page `/agencyadmin/change-password`, `ChangePassword.tsx`).

**Roles** (`backend/src/types/roles.ts`, enforced by `backend/src/middleware/requireAgencyAuth.ts`):
`SUPER_ADMIN`, `DOCUMENT_REVIEWER`, `RECRUITER`, `CONTRACTOR`, `EMPLOYER`, `CANDIDATE` (new style) and the legacy names `admin`, `agency`, `staff`, `contractor`. Anything unknown falls back to `RECRUITER`.
Only `SUPER_ADMIN` / `admin` / `agency` count as an administrator; `CONTRACTOR` gets the contractor task list only (`GET /api/contractor/tasks`, `POST /api/contractor/tasks/:id/complete`).

### 5.2 The sidebar — every button and what you do with it

The left-hand menu is defined in `frontend/src/components/AppLayout.tsx` (17 items, in this order). **Red badges** are unread counters refreshed every 5 seconds.

| # | Menu label | URL | What it is for | What to do there |
|---|---|---|---|---|
| 1 | **Home** | `/agencyadmin/dashboard` | Dashboard | Look at today's numbers first thing every morning |
| 2 | **Our Profile** | `/agencyadmin/agency-profile` | Agency micro-site + company info | Review/edit your public profile, logo, gallery, intro video, MOM personnel, testimonials (`/edit` for editing) |
| 3 | **Add Maid** | `/agencyadmin/add-maid` | Create a new helper profile | Fill the bio-data form (or **import from Excel/CSV**), upload 1–2 photos + 1 video, save (draft/publish) |
| 4 | **Manage Maids** | `/agencyadmin/edit-maids` | The helper database | Search/filter, edit, publish/unpublish, delete, bulk delete, bulk import, export CSV/XLS/PDF |
| 5 | **Applicants List** (`unreadApplicants` badge) | `/agencyadmin/recruitment` | ATS recruitment board | Review new applications from `/apply-as-maid`, screen, set stage, schedule interviews, background checks, match to a requirement |
| 6 | **Operations Center** | `/agencyadmin/operations-center` | Placements + saved employer requirements | Watch placements progress; save each employer's standard requirements so matching is repeatable |
| 7 | **Messages** (`unreadChats` badge) | `/agencyadmin/chat-support` | Live support chat with employers | Answer clients, use the AI suggestion panel, close conversations |
| 8 | **Security** | `/agencyadmin/change-password` | Account password | Change your own password (do it every 90 days) |
| 9 | **Contracts** | `/agencyadmin/employment-contracts` | Employment contracts + employer files | Create/duplicate/delete contracts, open one (`/:refCode`), edit, attach employer documents |
| 10 | **Enquiries** (`unreadEnquiries` badge) | `/agencyadmin/enquiry` | Enquiry inbox | Open each new enquiry, reply/follow up, mark progress, switch status `new → in_progress → replied → resolved` |
| 11 | **Requests** (`unreadRequests` badge) | `/agencyadmin/requests` | Employer hiring requests | Open a request, propose helpers, set status, chat inside the request |
| 12 | **Reports** | `/agencyadmin/reports` | Google Sheets export | Choose categories → **Test connection** → **Push report to Google Sheets** (one tab per category) |
| 13 | **AI Agents** | `/agencyadmin/ai-agents` | AI workbench + command center | Ask the AI to summarise, draft, screen, search helpers |
| 14 | **AI Marketing** | `/agencyadmin/ai-marketing` | Campaigns | Build an audience → generate campaign copy → see history; run the autonomous scan |
| 15 | **TikTok** | `/agencyadmin/tiktok` | Social automation | Connect the TikTok account, check status, disconnect |
| 16 | **AI HR Interviewer** | `/agencyadmin/ai-hr-interviewer` | Automated candidate interview | Run an interview session for a candidate, see score + notes |
| 17 | **Chatbot Config** | `/agencyadmin/chatbot-config` | Your own chatbot | Add topics + auto-reply rules used by the website chatbot and support chat |

**Extra admin screens that are *not* in the sidebar** (you reach them by clicking inside a list):

| Screen | URL | Reached from |
|---|---|---|
| Helper profile (admin view) | `/agencyadmin/maid/:refCode` | Manage Maids → click a helper |
| Helper full view | `/agencyadmin/maid/:refCode/full` | Helper profile → "full view" |
| Helper edit (page + popup) | `/agencyadmin/maid/:refCode/edit` , `.../edit-popup` | Helper profile → Edit |
| Request details | `/agencyadmin/requests/:requestId` | Requests → click a row |
| New contract | `/agencyadmin/employment-contracts/new` | Contracts → New |
| Contract view / edit | `/agencyadmin/employment-contracts/:refCode` , `.../edit` | Contracts → click a row |
| Operations board | `/agencyadmin/operations` | Placement board (legacy entry point) |
| Contractor tasks | `/agencyadmin/contractor-tasks` | Contractor-role staff (`GET /api/contractor/tasks`) |
| AI command center | floating panel on every admin page except AI Agents, Applicants List and Messages | `App.tsx` → `shouldShowGlobalAiCommandCenter` |

**Opening a badge section clears the badge.** The portal does this automatically: Requests → `POST /api/requests/mark-viewed`, Enquiries → `POST /api/enquiries/mark-viewed`, Applicants → `POST /api/ats/applications/mark-viewed`.

### 5.3 Adding a helper (Add Maid)

Screen: `frontend/src/pages/AddMaid.tsx` → `/agencyadmin/add-maid`

**Step by step**
1. Open **Add Maid**. The form is split into tabs (personal details, passport/ID, employment history, skills & evaluations, medical, employer preferences, photos, video).
2. Type the data, **or** press the Excel/CSV import button and pick your spreadsheet (`handleImportExcel` + `loadXlsx`). Import maps the columns into the same form so you can correct anything before saving.
3. **Photos:** upload with the photo button (`handleUploadPhoto`). Images are automatically shrunk in the browser (`frontend/src/lib/imageCompression.ts`) and you can run **Apply passport background** / **Reset passport frame** (`handleApplyPassportBg`, `handleResetPassportFrame`) to normalise the head-shot.
4. **Video:** one introduction video clip per helper (link or upload).
5. Press **Save** — the save runs in the background with a progress card (`frontend/src/lib/maidSaveProgress.ts`), so you can keep working; you get "uploading → processing → success/error".
6. If the reference code already exists the portal asks what to do: **skip the duplicate** or **auto-configure** it (`handleDuplicateReferenceSkip`, `handleDuplicateReferenceAutoConfigure`).
7. Leave a helper **unpublished** (draft) until the paperwork is complete; publish when you are ready for employers to see them.

**Rules the system enforces**
- Media limit: **2 photos** and **1 video clip** per helper (see the feature list on the login page: "Upload up to 2 photos per maid", "Upload 1 introduction video clip per maid").
- Public visitors never receive original photos: `/api/maids/:referenceCode/photo-preview` returns a **blurred, watermarked-size preview**; originals are only served to an authenticated session (`photo-authenticated`) or through a short-lived token (`photo-original`).
- Every helper belongs to an **agencyId** — you only ever see and edit your own agency's helpers.

**Underlying API for this screen**

| Endpoint | Purpose |
|---|---|
| `POST /api/maids` | Create a helper profile |
| `PUT /api/maids/:referenceCode` | Update a helper |
| `PATCH /api/maids/:referenceCode/visibility` | Publish / unpublish (draft) |
| `PATCH /api/maids/:referenceCode/photo` | Replace the main photo |
| `PATCH /api/maids/:referenceCode/photos` | Add a photo to the gallery |
| `PUT /api/maids/:referenceCode/photo-gallery` | Replace the whole gallery |
| `PATCH /api/maids/:referenceCode/video` | Set the introduction video |
| `PATCH /api/maids/:referenceCode/bring-to-top` | Re-order / feature the helper first |
| `GET /api/maids/photos-batch` | Fast photo lookup for list screens |
| `POST /api/maids/import.batch` / `POST /api/maids/import.csv` | Bulk import from spreadsheet/CSV |
| `GET /api/maids/export.csv` / `GET /api/maids/export.xls` | Bulk export |

### 5.4 Managing the helper database (Manage Maids)

Screen: `frontend/src/pages/EditMaids.tsx` → `/agencyadmin/edit-maids`

**What to do**
1. Use the search box + filters (nationality, salary, age, experience, skills) to find a helper — filtering is done by `frontend/src/lib/maidFilter.ts` → `filterMaids()`.
2. Click a row → **helper profile** (`/agencyadmin/maid/:refCode`) with tabs: overview, edit, photos, video, PDF export, "bring to top", delete.
3. Tick rows to act in bulk: **publish / unpublish** (`updateMaidVisibility`), **delete** (`deleteMaid`), **export selected to PDF** (`handleExportPdf` → `exportMaidProfilesToPdf`).
4. Use **Add Employment / employment history** entries inside the helper form (`/agencyadmin/employment-contracts/new` is the contract side, not the helper history).
5. Send a single helper to an employer with **Send to client** (`frontend/src/components/SendMaidToClientDialog.tsx`, `frontend/src/lib/maidShare.ts`) — this is how a shortlist proposal is created from the helper record.
6. **Export a bio-data PDF** from the helper profile (`exportMaidProfileToPdf` / `...ToWord` / `...ToExcel` in `frontend/src/lib/maidExport.ts`) and from **PDF Autofill** (`frontend/src/pages/PdfAutofill.tsx`) to auto-fill MOM/employment forms.

### 5.5 Employer hiring requests (menu **Requests**)

Screens: `frontend/src/pages/RequestsPage.tsx` (list) and `RequestDetailsPage.tsx` (one request) → `/agencyadmin/requests`, `/agencyadmin/requests/:requestId`

**The four statuses** (`frontend/src/lib/requests.ts` → `requestStatusMeta`): `pending` → `interested` → `direct_hire`, or `rejected`.
Two request types exist: **general** (standard enquiry-driven hire) and **direct** (direct hire of a specific helper).

**What to do, in order**
1. Open **Requests**. New requests carry the red badge; opening the page marks them as seen (the request itself stays `pending` — viewing does not change the workflow status).
2. Filter by status using the status counters (`GET /api/requests/status-counts`) or type a client name / helper reference.
3. Click a request → request details: client info, message, requested helpers, and the **request chat** (the employer and the office talk inside the request).
4. Attach helpers to the request with **Update maids** → `PATCH /api/requests/:id/maids` (send references of the helpers you propose).
5. Move the status forward → `PATCH /api/requests/:id/status`:
   - `interested` = you found a match and told the client;
   - `direct_hire` = the client confirmed;
   - `rejected` = closed / not proceeding.
6. Chat: the conversation + messages endpoints are `GET /api/conversations/:requestId`, `GET /api/messages/:conversationId`, `POST /api/messages`.
7. Housekeeping: multi-select rows → **Delete** (`DELETE /api/requests/bulk`); the employer's own answers (`interested` / `direct_hire` / `reject`) arrive from the client portal on `/api/client/direct-sales/:id/...`.

**What the employer sees** mirrors this: request progress is visualised by `frontend/src/components/RequestProgressTracker.tsx` (`ProgressTimeline`, `StatusSummary`, `RequestSummary`) using `getRequestProgressSteps`, `requestWhatsHappening`, `requestWhatsNext`.

### 5.6 Enquiries (menu **Enquiries**)

Screens: `frontend/src/pages/AdminEnquiry.tsx` → `/agencyadmin/enquiry`

1. Every website enquiry lands in this inbox (structured by the enquiry extractor: name, contact, service needed, location, urgency, budget).
2. Statuses: `new` → `in_progress` → `replied` → `resolved` (`PATCH /api/enquiries/:id`).
3. Opening the page marks enquiries as viewed (`POST /api/enquiries/mark-viewed`) so the badge resets; the status still needs to be changed manually.
4. Delete an enquiry: `DELETE /api/enquiries/:id` (bulk: `DELETE /api/enquiries/bulk`).
5. New enquiries can be pushed straight into a support conversation (see `backend/src/lib/enquiryToSupportIntegration.ts` → `createSupportConversationFromEnquiry`, `generateSupportMessage`), so replying from **Messages** keeps one thread.
6. The page can also **stream** new enquiries live (`GET /api/enquiries/stream`, `SSE` in `frontend/src/lib/sse.ts`).

### 5.7 Messages and your own chatbot

Screens: `frontend/src/pages/AdminSupportChat.tsx` (menu **Messages**, `/agencyadmin/chat-support`) and `AgencyChatbotConfig.tsx` (menu **Chatbot Config**, `/agencyadmin/chatbot-config`)

**Messages (support chat)**
- Left column = conversations of *your* agency's employers; right column = the thread. Unread counts come from `GET /api/chats/admin/summary`, live updates from `GET /api/chats/admin/stream`.
- Reply with `POST /api/chats/admin/:clientId`; change thread metadata (status `OPEN` / `PENDING` / `CLOSED`, category, priority) with `PATCH /api/chats/admin/:clientId`.
- Presence: the portal sends `POST /api/chats/admin/heartbeat` and `POST /api/chats/admin/offline` so "online" dots are accurate.
- The AI suggestion panel (`frontend/src/components/ai/AiAgentPanel.tsx`, `AiInquiryPanel.tsx`) drafts replies for staff to approve — **the AI proposes, a human sends**.
- Enquiry categories: `General Inquiry`, `Document Request`, `Matching`, `Contract`, `Payment`, `Complaint`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

**Chatbot Config**
1. Add a **topic** (button, question label, option list) and a **response rule** (keyword → reply text).
2. Save → `PUT /api/chats/admin/config` (read back with `GET /api/chats/admin/config`).
3. The public website chatbot + the client portal chatbot use this configuration, so changes are live immediately.

### 5.8 Contracts and employer documents (menu **Contracts**)

Screens: `frontend/src/pages/EmploymentContracts.tsx` (list), `AddEmployment.tsx` (new), `EmploymentContractView.tsx` (view), `EditEmployer.tsx` (edit), plus the shared form `frontend/src/components/EmploymentContractFormPage.tsx` / `ContractForm.tsx`.
Routes: `/agencyadmin/employment-contracts`, `/new`, `/:refCode`, `/:refCode/edit`.

**What to do**
1. Open **Contracts** → the list shows every employer contract for your agency with fee/case reference data.
2. **New** → click **Duplicate** on an existing contract to copy an employer, or start a fresh one and use **ContractForm**; the helper's bio-data is pre-filled when you arrive from a helper profile.
3. Upload the signed paperwork (WP application draft, FDW authorisation, service agreement, pricing schedule, insurance, payslips…) with the employer file uploader.
4. Open a contract → view/print/merge all attachments into **one PDF** (`frontend/src/lib/employerPdf.ts` → `mergeEmployerPdfFiles`, `downloadMergedEmployerPdf`, `printMergedEmployerPdf`).
5. Let the AI draft a contract body when needed: `POST /api/contracts/generate` → `generateContractWorkflow` → `generateContractDraftWithAi`.
6. Delete an obsolete contract (`DELETE /api/employers/:refCode`) or a single attachment (`DELETE /api/employer-contract-files/:id`).

**API behind it**

| Endpoint | Purpose |
|---|---|
| `GET /api/employers` · `GET /api/employers/:refCode` | List / read employer contracts |
| `POST /api/employers` · `POST /api/employment-contract` | Create or update a contract (same handler `saveEmployerContract`) |
| `DELETE /api/employers/:refCode` | Delete a contract |
| `GET /api/employer-contract-files` (alias `/api/employer-files`) | List the uploaded documents |
| `POST /api/employer-contract-files` | Upload documents |
| `GET /api/employer-contract-files/:id/view` · `/:id/download` | Open / download a document |
| `DELETE /api/employer-contract-files/:id` | Delete a document |
| `POST /api/contracts/generate` | AI contract draft |
| `POST /api/pdf-autofill` | AI read of a bio-data PDF → auto-fill the **Add Maid** form (banner inside that page) |

### 5.9 Applicants (menu **Applicants List** — the ATS recruitment board)

Screen: `frontend/src/pages/AtsRecruitmentPage.tsx` → `/agencyadmin/recruitment`

Helpers who apply through the public form `/apply-as-maid` become **ATS applications** here.

**What to do**
1. Open **Applicants List**. The badge counts unseen applications; opening the page clears it (`POST /api/ats/applications/mark-viewed`).
2. Use the funnel/dashboard tiles (`GET /api/ats/dashboard`) and the stage filters to see where candidates are stuck.
3. Filter by stage, qualification, document status; **save a filter preset** (`POST /api/ats/presets`) so your favourite view is one click away.
4. Open an application → applicant profile, documents, interview record, background check, score breakdown (`ATS Scores`: AI qualification breakdown).
5. **Move the stage** (`PATCH /api/ats/applications/:applicationId/stage`) and record the reason — every change is written to **stage history** (audit trail).
6. **Interview:** `PUT /api/ats/applications/:applicationId/interview`; **background check:** `PUT /api/ats/applications/:applicationId/background-check`.
7. **Bulk actions** on selected rows (`POST /api/ats/bulk-actions`): stage change for many candidates at once.
8. **Match to a requirement:** paste the employer's requirement text into the AI matching box → `POST /api/ats/match` ranks the best applicants for that request.
9. Optional: create/refresh applications straight from your helper records with `POST /api/ats/sync-from-maids` (Express route).

**Applicant-side endpoints:** `POST /api/ats/public/apply` (the public form, with document upload) and `GET /api/ats/public/applications/:applicationId` (the applicant's own status page, protected by an access token).

**Stage names** come from `RecruitmentStage` in `backend/src/atsStore.ts`; qualification bands from `QualificationCategory` (`Not Qualified` …).

### 5.10 Operations Center, placement board and contractor tasks

| Screen | Route | What to do |
|---|---|---|
| **Operations Center** (`AgencyOperationsCenterPage.tsx`) | `/agencyadmin/operations-center` | Watch every placement in progress; open each employer's **requirements** panel and **save the standard requirements** so future matching is repeatable (`GET|PUT /api/employers/:employerId/requirements`, service `backend/src/services/employerRequirementsService.ts`) |
| **Operations board** (`OperationsBoardPage.tsx`) | `/agencyadmin/operations` | Flat board of placements (`GET /api/operations-board`) |
| **Contractor tasks** (`ContractorTasksPage.tsx`) | `/agencyadmin/contractor-tasks` | For contractor-role staff: your assigned jobs, write a note, mark complete (`GET /api/contractor/tasks`, `POST /api/contractor/tasks/:id/complete`) |
| **Arrival / interview alerts** | – | When a contractor is due, or an interview is scheduled, Make.com scenarios raise the alert (`helped-contractor-arrival-alert`, `helped-interview-scheduled-alert`) |

### 5.11 Reports → Google Sheets (menu **Reports**)

Screen: `frontend/src/pages/AgencyReportsPage.tsx` → `/agencyadmin/reports`. Full instructions: **`docs/GOOGLE_SHEETS_REPORTS.md`**.

**What to do**
1. Open **Reports**. The connection panel tells you whether the Google service account is configured, which e-mail to share the sheet with, and which spreadsheet id is in effect (`agency` = yours, `worker` = the default).
2. (Optional) Paste **your own** spreadsheet id/URL for this agency only → **Save settings** (`PUT /api/reports/config`).
3. Click **Test connection** (`POST /api/reports/google-sheet/test`) — it verifies credentials and reports how many tabs the sheet already has.
4. Choose **All data** or **Selected only** (tick categories).
5. Click **Push report to Google Sheets** (`POST /api/reports/google-sheet`). The result panel lists every tab written, its row count and a link to the spreadsheet.

**One tab per category (21 tabs)**

| Group | Tabs |
|---|---|
| Agency Profile | `Agency Profile`, `MOM Personnel`, `Testimonials`, `Agency Staff Accounts` |
| Maids | `Maids` |
| Leads | `Enquiries`, `Clients`, `Direct Sales` |
| Requests | `Requests`, `Request Conversations`, `Request Messages` |
| Messages | `Chat Messages` |
| Contracts | `Employers`, `Employment Contracts` |
| Applicants | `ATS Applications`, `ATS Applicant Profiles`, `ATS Scores`, `ATS Stage History`, `ATS Documents`, `ATS Notifications`, `ATS Filter Presets` |
| Integrations | `TikTok Integration` |

Other endpoints: `GET /api/reports/status` (readiness, never returns the private key), `GET /api/reports/sections` (catalogue).

**Most common failure:** HTTP 403 `PERMISSION_DENIED` = the spreadsheet was never **shared with the service-account e-mail as Editor**.

### 5.12 The AI tools inside the portal

| Menu / place | Route | What it does | What to do |
|---|---|---|---|
| **AI Agents** (`AiAgentsPage.tsx`, `GlobalAiCommandCenter`) | `/agencyadmin/ai-agents` | Agent workbench + natural-language command center over your own data (helpers, enquiries, applicants) | Ask in plain English ("show unread enquiries", "find helpers for a newborn in Bukit Timah"), then run the suggested action |
| **AI Marketing** (`AiDirectMarketingPage.tsx`) | `/agencyadmin/ai-marketing` | Audience builder, campaign copy generator, campaign history, autonomous scan | Pick an audience → generate the campaign (`POST /api/ai/direct-marketing/generate`) → copy the text; `GET /api/ai/direct-marketing/autonomous/scan` + `POST /api/ai/direct-marketing/autonomous/run` find opportunities by themselves |
| **AI HR Interviewer** (`AiHrInterviewerPage.tsx`) | `/agencyadmin/ai-hr-interviewer` | Structured interview chat with a candidate → score, notes, stage, result | Start a session, feed the candidate's answers, read the evaluation (`POST /api/ai/hr-interview/chat`, `/session`, `/email`, `/schedule`) |
| **TikTok** (`AiAutomationPage.tsx`) | `/agencyadmin/tiktok` | Connect/disconnect the TikTok account used for automation | Connect → authorise → check status (`GET /api/tiktok/auth-url`, `/status`, `POST /api/tiktok/disconnect`) |
| **AI panel in Messages** | `/agencyadmin/chat-support` | Draft replies, summarise a thread, suggest the next action | Review → edit → send. The AI never sends by itself |
| **Floating AI command center** | every admin page except AI Agents / Applicants / Messages | The same assistant, always one click away | `App.tsx` → `shouldShowGlobalAiCommandCenter` |
| **Public AI receptionist** | bubble on the public site | Answers first questions and captures leads | `frontend/src/components/ai/PublicAiReceptionist.tsx`, `POST /api/ai/receptionist`, `POST /api/ai/processInquiry` |
| **Applicant AI assistant** | inside the applicant flow | Helps a candidate finish and track the application | `frontend/src/components/ApplicantAiAssistant.tsx`, `/api/applicant-assistant/chat` + `/tracker` |
| **AI autopilot (cron)** | automatic, every 30 minutes | Scans agency work, runs the relevant agent, **stores proposed actions for review** | Nothing to click; it only proposes. Toggle with `AI_AUTOPILOT_ENABLED` |
| **WhatsApp automation** | via API | Broadcasts, templates, per-candidate conversation stages | `/api/whatsapp/metrics`, `/conversations`, `/templates`, `/broadcasts`, `/candidates/:referenceCode/...` |
| **Google Drive sync / transcription** | via API | Push a private document to Drive, or transcribe a voice note | `POST /api/integrations/google-drive/sync` · `/upload-and-sync` · `POST /api/integrations/media/transcribe` |
| **Knowledge base (SOP/FAQ)** | via API | Index your SOPs/FAQ so the AI answers from them | `POST /api/knowledge/documents`, `GET /api/knowledge/search` |

### 5.13 Your agency profile and security

| Screen | Route | What to do |
|---|---|---|
| **Our Profile** (`AgencyProfile.tsx`) | `/agencyadmin/agency-profile` | Read-only summary of your public micro-site: logo, gallery, intro video, MOM personnel list, testimonials |
| **Edit profile** (`AgencyProfileEdit.tsx`) | `/agencyadmin/agency-profile/edit` | Upload logo/gallery/video, edit company details, add/remove **MOM personnel** (`POST /api/company/mom-personnel`, `PUT|DELETE /api/company/mom-personnel/:id`) and **testimonials** (`POST /api/company/testimonials`, `DELETE /api/company/testimonials/:id`) |
| **Security** (`ChangePassword.tsx`) | `/agencyadmin/change-password` | Change your own password (`POST /api/agency-auth/change-password`) |
| **Public agencies directory** | `/agencies`, `/agencies/:id`, `/agency-portal` | What the public sees: `GET /api/agencies`, `GET /api/agencies/:id` |

### 5.14 Daily / weekly checklist for the boss

**Every morning (10 minutes)**
1. Log in at `/agency` → **Home** dashboard: check today's counts.
2. **Enquiries** badge → answer every new enquiry and set a status.
3. **Requests** badge → progress each new hiring request (attach helpers, set `interested`).
4. **Messages** badge → reply to every employer message; close finished threads.
5. **Applicants List** badge → move new applicants to the right stage.

**Every few days**
6. **Manage Maids** → publish the helpers whose documents are complete; unpublish/delete the rest.
7. **Operations Center** → check no placement is stuck; update contractor tasks.
8. **Contracts** → make sure every active placement has a signed contract and all attachments uploaded.

**Every month**
9. **Reports** → push the Google Sheets report and read the month's numbers.
10. **AI Agents / AI Marketing** → skim proposals the autopilot left for review.
11. **Security** → rotate the portal password; remove staff accounts that left (administrators are managed with `POST /api/agency-auth/admins`, roles enforced by `requireAgencyRole`).
12. Back up: the Reports Google Sheet plus a Supabase backup is the safety net.

---

## Part 6 — Every function, file by file (reference for IT / developers)

### 6.1 Front-end pages (`frontend/src/pages/*.tsx` and `frontend/src/ClientPage/*.tsx`)

| File | Default export | What the function does |
|---|---|---|
| `pages/Index.tsx` | (none) | Dead file — the whole file is commented out. `App.tsx` routes `/` to `ClientHomeRedirect` |
| `pages/HomePage.tsx` | `HomePage` | Agency **dashboard**: summary tiles, `loadSummary()`, refresh on tab visibility |
| `pages/AddMaid.tsx` | `AddMaid` | Create a helper: multi-tab bio-data form, Excel/CSV import, photo/video upload, passport-photo tools, duplicate-code handling, background save task |
| `pages/EditMaids.tsx` | `EditMaids` | Helper database: paged list, filters, publish/unpublish, delete/bulk delete, import/export, PDF export |
| `pages/EditMaidProfile.tsx` | `EditMaid` | Edit one helper (used as page and as popup via the `popup` prop) |
| `pages/MaidProfile.tsx` | `MaidProfilePage` | Admin view of one helper: photo/video gallery, replace-search, bring-to-top, PDF export, delete |
| `pages/MaidProfileFullView.tsx` | `MaidProfileFullView` | Full-screen read-only helper profile |
| `pages/PublicMaidProfile.tsx` | `PublicMaidProfile` | Public helper profile (`/maids/:refCode`) |
| `pages/AddEmployment.tsx` | `AddEmployment` | Create an employment contract |
| `pages/EmploymentContracts.tsx` | `EmploymentContracts` | Contract list: select, duplicate, delete, open |
| `pages/EmploymentContractView.tsx` | `EmploymentContractView` | View one contract with prefilled read-only `ContractForm` + attachments |
| `pages/EditEmployer.tsx` | `EditEmployer` | Edit an employer/contract record |
| `pages/AdminEnquiry.tsx` | `AdminEnquiry` | Enquiry inbox: list, status, delete, live stream |
| `pages/RequestsPage.tsx` | `RequestsPage` | Hiring-request list with status counters, filters, bulk delete |
| `pages/RequestDetailsPage.tsx` | `RequestDetailsPage` | One request: client, helpers, request chat, status changes |
| `pages/AdminSupportChat.tsx` | `AdminSupportChat` | Support chat console for the agency + AI suggestions |
| `pages/AtsRecruitmentPage.tsx` | `AtsRecruitmentPage` | ATS board: tiles, filters, presets, stage moves, bulk actions, AI matching |
| `pages/AgencyOperationsCenterPage.tsx` | `AgencyOperationsCenterPage` | Placements + employer requirement templates (`loadPlacements`, `loadRequirements`, `saveRequirements`) |
| `pages/OperationsBoardPage.tsx` | `OperationsBoardPage` | Placement board (`GET /api/operations-board`) |
| `pages/ContractorTasksPage.tsx` | `ContractorTasksPage` | Contractor job list with notes + complete button |
| `pages/AgencyReportsPage.tsx` | `AgencyReportsPage` | Google Sheets report page: load status, toggle sections, save config, test, run |
| `pages/AgencyProfile.tsx` | `AgencyProfile` | Read-only agency profile summary |
| `pages/AgencyProfileEdit.tsx` | `AgencyProfileEdit` | Edit agency profile, logo/gallery/video upload, MOM personnel CRUD, testimonials CRUD |
| `pages/AgencyChatbotConfig.tsx` | `AgencyChatbotConfigPage` | Build chatbot topics + response rules, load/save config |
| `pages/AiAgentsPage.tsx` | `AiAgentsPage` (+ named `GlobalAiCommandCenter`) | AI workbench; the command center is also mounted globally on admin pages |
| `pages/AiDirectMarketingPage.tsx` | `AiDirectMarketingPage` | Marketing campaigns: audience, contacts, history, status, autonomous scan |
| `pages/AiHrInterviewerPage.tsx` | `AiHrInterviewerPage` | AI interview chat: messages, evaluation, stage, result |
| `pages/AiAutomationPage.tsx` | `AiAutomationPage` | TikTok connect/disconnect + automation status (`/agencyadmin/tiktok`) |
| `pages/PdfAutofill.tsx` | `PdfAutofillPage` (returns `null`) + named `PdfAutofillBanner` | AI PDF → form filler. The **banner** is embedded inside Add Maid; the page export is intentionally empty |
| `pages/EnquiryIntakePage.tsx` | `EnquiryIntakePage` | Standalone page wrapping `EnquiryIntakeForm` |
| `pages/ChangePassword.tsx` | `ChangePassword` | Agency-admin password change screen |
| `pages/PublicMaidApplicationPage.tsx` | `PublicMaidApplicationPage` | Public helper application form (`/apply-as-maid`) |
| `pages/PublicMaidApplicationStatusPage.tsx` | `PublicMaidApplicationStatusPage` | Applicant status lookup |
| `pages/HiringProcessPage.tsx` | `HiringProcessPage` | Public hiring-process page for one helper (`/hire/:refCode`) |
| `pages/AuthCallback.tsx`, `pages/TikTokCallback.tsx` | `AuthCallback`, `TikTokCallback` | OAuth return handlers |
| `pages/PrivacyPolicy.tsx`, `pages/TermsOfService.tsx`, `pages/DataDeletion.tsx` | same names | Legal / data-deletion pages |
| `pages/NotFound.tsx` | `NotFound` | 404 page |
| `ClientPage/ClientLandingPage.tsx` | `ClientLandingPage` | Public landing page |
| `ClientPage/ClientEmployerLogin.tsx` | (page) | Employer login: password, Google, Facebook, phone OTP |
| `ClientPage/ClientPortalLayout.tsx` | (page) | Employer portal shell (navbar + outlet) |
| `ClientPage/ClientPortalNavbar.tsx` | (component) | Employer portal tabs: Home, Search Maid, Messages, FAQ, Enquiry |
| `ClientPage/ClientPortalHome.tsx` | (page) | Employer home summary tiles |
| `ClientPage/ClientMaidsPage.tsx` | (page; also exports `RequestForm`, `defaultFilters`, `GLOBAL_CSS`) | Public/portal helper browsing + request form |
| `ClientPage/MaidSearchPage.tsx` | (page) | Search results with shortlist + filters |
| `ClientPage/ClientRequestsPage.tsx` | (page) | Employer's request list |
| `ClientPage/ClientSupportChat.tsx` | (page) | Employer ↔ agency chat |
| `ClientPage/ClientProfilePage.tsx` | (page) | Employer profile |
| `ClientPage/ClientChangePasswordPage.tsx` | (page) | Employer password change |
| `ClientPage/ClientDashboard.tsx`, `ClientHistoryPage.tsx` | (pages) | Legacy employer dashboard / history |
| `ClientPage/Enquiry.tsx` | (page) | Enquiry form (public, and `embedded` inside the portal) |
| `ClientPage/FAQPage.tsx` | (page) | FAQ page |
| `ClientPage/AboutUs.tsx` | (page) | About page |
| `ClientPage/ServiceDetails.tsx` | (page) | One service page (`/services/:slug`) |
| `ClientPage/TrackProgress.tsx` | (page) | Request progress tracker |
| `ClientPage/ClientAiAgentsPage.tsx` | `ClientAiAgentsPage` | Employer-facing description of the AI agents |
| `ClientPage/AgencyPortal.tsx` | `AgencyPortalPage({ embedded })` | **Agency login / e-mail verification page** (handlers: `handleSubmit`, `handleVerifyCode`, `handleResendCode`) |
| `ClientPage/ClientTheme.css` | – | Portal theme styles |

### 6.2 Front-end components (`frontend/src/components/**`)

| File | Exports | What it does |
|---|---|---|
| `AppLayout.tsx` | `AppLayout` (default) | **Agency portal shell**: sidebar with the 17 menu items, badge polling every 5 s, notification bell, logout; internal helpers `useIsDesktop`, `Icon3D`, `Tooltip`, `readAdminNotificationCache`, `writeAdminNotificationCache`, `clearNotificationCacheForAgency`, `formatNotificationTime`, `getAdminNotificationHref`, `getNotificationTone` |
| `ProtectedClientRoute.tsx` | `ProtectedClientRoute` | Guards employer portal pages behind a Supabase session |
| `SeoMetadata.tsx` | `SeoMetadata` | Injects title/description/canonical tags per route |
| `AiAgentPanel.tsx`, `ai/AiInquiryPanel.tsx`, `ai/AiLeadCaptureForm.tsx`, `ai/PublicAiReceptionist.tsx` | default components | AI panels: agent workbench panel, enquiry panel, lead capture form, public receptionist bubble |
| `ApplicantAiAssistant.tsx` | `ApplicantAiAssistant` (+ `ApplicantAiAssistantProps`) | Chat assistant for job applicants |
| `RecruiterAiAssistant.tsx` | `RecruiterAiAssistant` | Chat assistant for recruiters (screening, drafting) |
| `chat/ChatWorkspace.tsx` | `ChatWorkspace` (+ types) | Reusable chat UI used by both portals |
| `whatsapp/WhatsAppConversationPanel.tsx` | panel component | WhatsApp conversation viewer/sender |
| `MaidForm.tsx` | `MaidForm` | The big helper bio-data form (shared by Add/Edit) |
| `ContractForm.tsx` | `ContractForm` | Employment contract form |
| `EmploymentContractFormPage.tsx` | `EmploymentContractPage({ mode })` | Contract page wrapper (`view` / `edit` modes) |
| `EnquiryIntakeForm.tsx` | `EnquiryIntakeForm` | Structured enquiry form with live extraction |
| `RequestProgressTracker.tsx` | `ProgressTimeline`, `StatusSummary`, `RequestSummary` | Visual request progress for employers |
| `SendMaidToClientDialog.tsx` | dialog | Send a helper profile to a client |
| `HireConfirmationDialog.tsx` | dialog | Confirm a hire |
| `RecruiterCalendar.tsx` | calendar | Interview calendar |
| `OtpInput.tsx` | `OtpInput` | 6-digit code input (phone + e-mail verification) |
| `SocialOAuthButtons.tsx` | buttons | Google / Facebook sign-in buttons |
| `PublicSiteNavbar.tsx`, `PublicSiteFooter.tsx` | navbar / footer | Public website chrome |
| `AgencyCard.tsx` | `AgencyCard` | One agency card in the public directory |
| `DateInput.tsx`, `NavLink.tsx` | small inputs/links | Shared UI primitives |
| `design-system.tsx` | `StatusBadge`, `PriorityBadge`, `PageHeader`, `EmptyState`, `DesignCard`, `SectionHeader`, `AvatarInitials`, `InfoRow`, `TagPill` | Shared look-and-feel components |
| `ui/*.tsx` (50 files) | shadcn/Radix primitives | Buttons, dialogs, tables, selects, calendar, toast, sidebar, etc. |

### 6.3 Front-end hooks (`frontend/src/hooks/*`)

| Hook / function | What it does |
|---|---|
| `useAiAutomation.ts` → `triggerMakeScenario`, `submitInquiryWithAutomation`, `submitLeadWithAutomation`, `submitInterviewSession`, `useAiInquiry` | Calls the Make.com / AI automation endpoints for enquiries, leads and interview sessions (returns typed responses) |
| `useApplicantAssistant.ts` → `useApplicantAssistant(options)` | Chat state machine for the applicant AI assistant (send, history, tracker) |
| `useChatbot.ts` → `getBotReply(message)`, `BOT_TYPING_DELAY_MIN/MAX` | Rule-based chatbot replies + typing delay for the site chatbot |
| `use-mobile.tsx` → `useIsMobile()` | Responsive breakpoint hook |
| `use-toast.ts` → `reducer`, `useToast`, `toast` | Toast notification store (shadcn) |

### 6.4 Front-end library functions (`frontend/src/lib/*`)

| File | Functions (each one line) |
|---|---|
| `agencies.ts` | `fetchAgencyOptions()` public agency picker · `fetchAgencies()` agency directory list · `fetchAgencyDetails(id)` one agency + profile · `fetchAgencyMaids(id)` an agency's public helpers · `submitHiringRequest(payload)` create a hire request from the website |
| `agencyAdminAuth.ts` | `saveAgencyAdminAuth(token, admin, opts)` store session · `clearAgencyAdminAuth()` logout locally · `getAgencyAdminToken()` read token · `getStoredAgencyAdmin()` read cached admin · `getAgencyAdminAuthHeaders()` build `Authorization` header · `shouldShowAgencyAdminWelcome()` / `markAgencyAdminWelcomeShown()` first-login tour flag |
| `agencyReports.ts` | `fetchAgencyReportSections()` catalogue · `fetchAgencyReportStatus()` readiness · `saveAgencyReportConfig(input)` save sheet target/sections · `testAgencyGoogleSheetConnection()` test credentials · `runAgencyGoogleSheetReport(sections)` push the report · `isAgencyReportUnauthorized(error)` + class `AgencyReportUnauthorizedError` |
| `aiAgents.ts` | `callAiAgent(payload)` single entry point to the AI agent endpoints |
| `applicantAssistant.ts` | `sendApplicantAssistantMessage(payload)` · `fetchApplicantTracker(id)` · `createApplicantTracker(payload)` |
| `ats.ts` | `fetchAtsDashboard()` · `fetchAtsApplications(params)` · `fetchAtsApplication(id)` · `updateAtsStage(id, stage, reason)` · `bulkAtsAction(payload)` · `matchAtsCandidates(payload)` · `fetchAtsPresets()` · `saveAtsPreset(name, filters)` · `submitPublicAtsApplication(formData)` · `fetchPublicAtsApplicationSummary(id, token)` |
| `chat.ts` | Conversation/message/notification types + `fetchClientUnreadChatCount()`, `fetchAdminUnreadChatCount()`, `markAdminNotificationsRead()`, `markClientNotificationsRead()` |
| `clientAuth.ts` | `saveClientAuth(token, client)` · `clearClientAuth()` · `getClientToken()` · `getStoredClient()` · `refreshClientToken()` · `getClientAuthHeaders()` |
| `clientNavigation.ts` | `buildEmployerLoginPath(redirectTo)` · `getClientPostLoginPath(redirectTo)` · `stashPostLoginRedirect()` / `consumePostLoginRedirect()` remember where to go after login · `DEFAULT_CLIENT_POST_LOGIN_PATH` |
| `design-tokens.ts` | `tokens` colour/spacing tokens · `getStatusConfig(status)` · `getPriorityConfig(priority)` |
| `employerPdf.ts` | `mergeEmployerPdfFiles(files)` · `downloadMergedEmployerPdf(...)` · `printMergedEmployerPdf(...)` |
| `fileScan.ts` | `scanUploadedFile(options)` pre-upload file validation/scan |
| `imageCompression.ts` | `compressImage(dataUrl)`, `compressImageFile(file)`, `compressImages(files)`, `getImageSizeInMB(dataUrl)`, `getReadableFileSize(bytes)` |
| `maidExport.ts` | `exportMaidProfileToWord(maid)` · `...ToExcel(maid)` · `...ToPdf(maid)` · `exportMaidProfilesToPdf(maids[])` |
| `maidFilter.ts` | `filterMaids(maids, filters)` client-side search/filter logic |
| `maids.ts` | `NATIONALITY_DIAL_CODE`, `getDialCodePrefillForNationality(...)`, `defaultMaidProfile`, `formatDate(value)`, `getPrimaryPhoto(maid)`, `getPublicIntro(maid)`, `getExperienceBucket(maid)`, `calculateAge(dob)` |
| `maidSaveProgress.ts` | Background save task store: `startMaidSaveTask(...)`, `readMaidSaveTask(id)`, `subscribeToMaidSaveTask(id, cb)`, `dismissMaidSaveTask(id)` |
| `maidShare.ts` | `getPublicMaidUrl(refCode)` public link builder · `sendMaidToClient(maid)` share a helper with a client |
| `requests.ts` | `fetchRequests`, `fetchRequestStatusCounts`, `fetchRequest`, `createRequest`, `updateRequestStatus`, `updateRequestMaids`, `deleteRequests`, `fetchRequestConversation`, `fetchRequestMessages`, `createRequestMessage`, `notifyRequestsChanged`, `subscribeToRequestsChanged`, `requestStateMessage`, `getRequestProgressSteps`, `getRequestCurrentStepIndex`, `requestWhatsHappening`, `requestWhatsNext`, `requestNeedsUserAction`, `requestStatusMeta` |
| `routes.ts` | `ADMIN_BASE` (`/agencyadmin`) and `adminPath(path)` build agency-portal URLs |
| `safeJson.ts` | `readSafeJson(response)` never-throw JSON parsing with an error fallback |
| `shortlist.ts` | `getSavedShortlistRefs()`, `saveShortlistRefs(refs)`, `toggleShortlistRef(ref)`, `subscribeToShortlistRefs(listener)` — the employer shortlist |
| `sse.ts` | `streamSse(url, handlers)` Server-Sent Events reader (live chat / enquiries) |
| `supabaseAuth.ts` | `isClientLogoutPending()`, `clearSupabaseSessionStorage()`, `primeClientAuth()`, `getCurrentClientSession()`, `hasActiveClientSession()`, `finalizeClientLoginFromSupabase()`, `syncClientProfileFromSession()`, `handleInvalidClientSession()`, `clientFetch()`, `logoutClientPortal()`, `signInWithGoogle()`, `signInWithFacebook()`, `sendPhoneOtp(phone)`, `verifyPhoneOtp(phone, code)` |
| `supabaseClient.ts` | `supabase` client instance + `requireSupabase()` guard |
| `supabaseSessionFromUrl.ts` | `getSessionFromUrlCompat()` read a session out of an OAuth redirect URL |
| `userFacingErrors.tsx` | `getUserFacingError(error)` turn any error into a safe message · `logTechnicalError(context, error)` |
| `utils.ts` | `cn(...classes)` Tailwind class merge |
| `whatsapp.ts` | Types + `fetchWhatsAppConversation(ref)`, `sendWhatsAppMessage(payload)`, `sendWhatsAppInboundSimulation(payload)`, `updateWhatsAppStage(...)`, `fetchWhatsAppMetrics()` |

### 6.5 Back-end API reference — every endpoint and its handler

Mount points are set in `backend/src/server.ts`; the live Worker serves the same paths (plus a few Worker-only ones).

| Mount | Router file |
|---|---|
| `/api/company` | `routes/companyRoutes.ts` |
| `/api/maids` | `routes/maidRoutes.ts` |
| `/api/enquiries` **and** `/api/enquiry` | `routes/enquiryRoutes.ts` |
| `/api/direct-sales` **and** `/api/direct-sell` | `routes/directSaleRoutes.ts` |
| `/api/requests` | `routes/requestRoutes.ts` |
| `/api/conversations` | `routes/requestConversationRoutes.ts` |
| `/api/messages` | `routes/requestMessageRoutes.ts` |
| `/api/client-auth` | `routes/clientAuthRoutes.ts` |
| `/api/agency-auth` | `routes/agencyAuthRoutes.ts` |
| `/api/agency` | `routes/agencyRoutes.ts` |
| `/api/agencies` | `routes/agencyDirectoryRoutes.ts` |
| `/api/client` | `routes/clientRoutes.ts` |
| `/api/chats` | `routes/chatRoutes.ts` |
| `/api/leads` | `routes/leadWorkflowRoutes.ts` |
| `/api/inquiry` | `routes/inquiryWorkflowRoutes.ts` |
| `/api/ai` | `routes/aiRoutes.ts` |
| `/api/ai/direct-marketing` | `routes/directMarketingRoutes.ts` |
| `/api/whatsapp` | `routes/whatsappRoutes.ts` |
| `/api/ats` | `routes/atsRoutes.ts` |
| `/api/applicant-assistant` | `routes/applicantAssistantRoutes.ts` |
| `/api/events` | `routes/eventRoutes.ts` |
| `/api/contractor` | `routes/contractorRoutes.ts` |
| `/api/knowledge` | `routes/knowledgeRoutes.ts` |
| `/api/integrations` | `routes/integrationRoutes.ts` |
| `/api/employers` | `routes/employerRoutes.ts` |
| `/api/employer-contract-files` (+ alias `/api/employer-files`) | `routes/employerContractFileRoutes.ts` |
| `/api` (dashboard, matching workflow, automation, share) | `routes/dashboardRoutes.ts`, `matchingWorkflowRoutes.ts`, `automationRoutes.ts`, `shareRoutes.ts` |

**Core & company**

| Method + path | Handler | Purpose |
|---|---|---|
| `GET /api` | inline | API banner |
| `GET /api/health` | inline | Health + which storage backend is active |
| `GET /api/diagnostics` | inline (`getStoreDiagnostics`) | Storage mode, table names, counts |
| `GET /api/data` | inline | Sample data endpoint |
| `GET /api/public-maids` | inline (`getAllMaidsStore`) | Public helper list |
| `GET /api/company` | `getCompanyProfile` | Agency/company profile |
| `GET /api/company/summary` | `getCompanySummary` | Dashboard + badge counts (`unreadEnquiries`, `pendingRequests`, …) |
| `PUT /api/company` | `updateCompanyProfile` | Save profile |
| `POST /api/company/mom-personnel` | `addMOMPersonnel` | Add MOM personnel |
| `PUT /api/company/mom-personnel/:id` | `updateMOMPersonnel` | Update MOM personnel |
| `DELETE /api/company/mom-personnel/:id` | `deleteMOMPersonnel` | Remove MOM personnel |
| `POST /api/company/testimonials` | `addTestimonial` | Add testimonial |
| `DELETE /api/company/testimonials/:id` | `deleteTestimonial` | Remove testimonial |

**Helpers (maids)**

| Method + path | Handler | Purpose |
|---|---|---|
| `GET /api/maids` | `getMaidList` | List helpers (filters; unauthenticated callers only see public helpers) |
| `GET /api/maids/export.csv` / `.xls` | `exportMaidsCsv` / `exportMaidsXls` | Spreadsheet export |
| `POST /api/maids/import.batch` / `import.csv` | `importMaidsBatch` / `importMaidsCsv` | Spreadsheet/CSV import |
| `POST /api/maids/photos-batch` | `getMaidPhotosBatch` | Fast photo lookup |
| `GET /api/maids/:referenceCode` | `getMaidByReferenceCode` | One helper |
| `POST /api/maids` | `createMaid` | Create |
| `PUT /api/maids/:referenceCode` | `updateMaid` | Update |
| `PATCH /api/maids/:referenceCode/visibility` | `updateMaidVisibility` | Publish/unpublish |
| `PATCH /api/maids/:referenceCode/photo` | `updateMaidPhoto` | Replace main photo |
| `PATCH /api/maids/:referenceCode/photos` | `addMaidPhoto` | Add gallery photo |
| `PUT /api/maids/:referenceCode/photo-gallery` | `replaceMaidPhotos` | Replace gallery |
| `PATCH /api/maids/:referenceCode/video` | `updateMaidVideo` | Set intro video |
| `PATCH /api/maids/:referenceCode/bring-to-top` | `bringMaidToTop` | Re-order the helper to the top |
| `DELETE /api/maids/:referenceCode` | `deleteMaid` | Delete |
| `GET /api/maids/:referenceCode/photo-preview` | `getMaidPhotoPreview` | Blurred public preview (no auth) |
| `GET /api/maids/:referenceCode/photo-authenticated` | `getMaidAuthenticatedPhoto` | Original photo for logged-in staff |
| `GET /api/maids/:referenceCode/photo-original` | `getMaidOriginalPhoto` | Original photo behind a short-lived token |

**Enquiries, requests, conversations, direct sales**

| Method + path | Handler | Purpose |
|---|---|---|
| `GET /api/enquiries` | `getEnquiries` | Enquiry inbox |
| `GET /api/enquiries/unread-count` | `getUnreadEnquiryCount` | Badge count |
| `POST /api/enquiries/mark-viewed` | `markEnquiriesViewed` | Clear the badge |
| `POST /api/enquiries/extract` | `extractRawEnquiry` | Parse raw text into structured fields |
| `POST /api/enquiries` | `createEnquiry` | Create an enquiry |
| `PATCH /api/enquiries/:id` | `updateEnquiry` | Change status/notes |
| `DELETE /api/enquiries/:id` (also `/bulk`, `/stream`, `/last-id` in the Worker) | `deleteEnquiry` | Delete / live stream |
| `GET /api/requests` | `listRequests` | Request list with filters |
| `POST /api/requests` | `createRequest` | Create a request |
| `GET /api/requests/unread-count` | `getUnreadRequestCount` | Badge count |
| `POST /api/requests/mark-viewed` | `markRequestsViewed` | Clear the badge |
| `GET /api/requests/status-counts` | `getRequestStatusCounts` | Counters per status |
| `DELETE /api/requests/bulk` | `deleteRequests` | Bulk delete |
| `GET /api/requests/:id` | `getRequest` | One request |
| `PATCH /api/requests/:id/status` | `patchRequestStatus` | Move status |
| `PATCH /api/requests/:id/maids` | `patchRequestMaids` | Attach/remove proposed helpers |
| `GET /api/conversations/:requestId` | `getRequestConversation` | Request thread |
| `GET /api/messages/:conversationId` | `getRequestMessages` | Messages in a thread |
| `POST /api/messages` | `postRequestMessage` | Send a message in a request |
| `GET /api/direct-sales` | `getDirectSales` | Direct-sale leads |
| `GET /api/direct-sales/clients` | `getClientOptions` | Client picker |
| `POST /api/direct-sales` (+ `/:referenceCode`) | `createDirectSale` | Create a direct sale (propose helper) |
| `PATCH /api/direct-sales/:id/interested` / `/direct-hire` / `/reject` | `markDirectSaleInterested` / `markDirectSaleDirectHire` / `markDirectSaleRejected` | Client's answer |

**Authentication (employer + agency) and the employer portal**

| Method + path | Handler | Purpose |
|---|---|---|
| `POST /api/client-auth/register` | `registerClient` | Employer signup (sends 6-digit code) |
| `POST /api/client-auth/confirm` | `confirmClientEmail` | Verify the code |
| `POST /api/client-auth/resend` | `resendClientEmailConfirmation` | Resend the code |
| `POST /api/client-auth/login` | `loginClient` | Password login |
| `GET|PUT /api/client-auth/me` | `getClientMe` / `updateClientMe` | Read/update the employer profile |
| `POST /api/client-auth/logout` | `logoutClient` | Log out |
| `POST /api/agency-auth/register` | `registerAgencyAdmin` | Create an agency administrator |
| `POST /api/agency-auth/login` | `loginAgencyAdmin` | Agency login |
| `GET /api/agency-auth/me` | `getAgencyAdminMe` | Session validation (used by `ProtectedAdminRoute`) |
| `POST /api/agency-auth/logout` | `logoutAgencyAdmin` | Log out |
| `POST /api/agency-auth/change-password` | `changeAgencyAdminPassword` | Change password |
| `POST /api/agency-auth/admins` (also `POST /api/agency/admins`) | `createAgencyAdminForAgency` | Add a staff account |
| `GET /api/agencies` | `listAgencies` | Public agency directory |
| `GET /api/client/my-maids` | `getMyAssignedMaids` | Helpers assigned to this employer |
| `GET /api/client/history` | `getMyHistory` | Employer history |
| `PATCH /api/client/direct-sales/:id/interested` / `/direct-hire` / `/reject` | `markMyAssignmentInterested` / `markMyAssignmentDirectHire` / `markMyAssignmentRejected` | Employer's own answer |

**Chats (support + agency chat)**

| Method + path | Handler | Purpose |
|---|---|---|
| `GET /api/chats/client/conversations` | `getMyChatConversations` | Employer's threads |
| `GET /api/chats/client/config` | `getMyChatbotConfig` | Chatbot config for the client UI |
| `GET /api/chats/client/last-id` / `/stream` / `/summary` | `getMyChatLastId` / `streamMyChatMessages` / `getMyChatSummary` | Poll/stream + unread summary |
| `GET /api/chats/client` | `getMyChatMessages` | Read messages |
| `POST /api/chats/client` | `sendMyChatMessage` | Send a message |
| `POST /api/chats/client/bot-reply` | `postMyChatBotReply` | Bot reply hook |
| `POST /api/chats/client/heartbeat` / `/offline` | `clientHeartbeat` / `clientOffline` | Presence |
| `POST /api/chats/client/notifications/read` | `markClientNotificationsRead` | Clear client bell |
| `GET /api/chats/admin` | `getAdminChatConversations` | Agency threads |
| `GET /api/chats/admin/config` · `PUT` | `getAdminChatbotConfig` / `updateAdminChatbotConfig` | Chatbot topics/rules |
| `GET /api/chats/admin/last-id` / `/stream` / `/summary` | `getAdminChatLastId` / `streamAdminChatMessages` / `getAdminChatSummary` | Live updates + badges |
| `POST /api/chats/admin/heartbeat` / `/offline` | `adminHeartbeat` / `adminOffline` | Presence |
| `POST /api/chats/admin/notifications/read` | `markAdminNotificationsRead` | Clear the bell |
| `GET|POST|PATCH /api/chats/admin/:clientId` | `getAdminChatMessages` / `sendAdminChatMessage` / `updateAdminConversationMeta` | Read / reply / set status-category-priority |

**Applicants (ATS) and employer contracts**

| Method + path | Handler | Purpose |
|---|---|---|
| `POST /api/ats/public/apply` | `createPublicAtsApplicationController` | Public application form (+document upload) |
| `GET /api/ats/public/applications/:applicationId` | `getPublicAtsApplicationSummaryController` | Applicant status check |
| `GET /api/ats/dashboard` | `getAtsDashboardController` | Funnel/dashboard tiles |
| `GET /api/ats/applications` | `listAtsApplicationsController` | Application list (filters/paging) |
| `GET /api/ats/applications/unread-count` · `POST /applications/mark-viewed` | `getUnreadAtsApplicationCountController` · `markAtsApplicationsViewedController` | Badge |
| `POST /api/ats/sync-from-maids` | `syncAtsFromMaidsController` | Build applications from helper records (Express) |
| `GET|POST /api/ats/presets` | `listAtsPresetsController` · `saveAtsPresetController` | Saved filters |
| `POST /api/ats/bulk-actions` | `bulkAtsActionController` | Bulk stage change |
| `POST /api/ats/match` | `matchAtsApplicationsController` | AI match applicants to a requirement |
| `GET /api/ats/applications/:applicationId` | `getAtsApplicationController` | One application bundle |
| `PATCH /api/ats/applications/:applicationId/stage` | `updateAtsStageController` | Move stage (+reason) |
| `PUT /api/ats/applications/:applicationId/interview` | `upsertInterviewController` | Interview record |
| `PUT /api/ats/applications/:applicationId/background-check` | `upsertBackgroundCheckController` | Background check |
| `GET /api/employers` · `GET /api/employers/:refCode` | `listEmployerContracts` · `getEmployerContract` | Employer contracts |
| `POST /api/employers` · `POST /api/employment-contract` | `saveEmployerContract` | Create/update a contract |
| `DELETE /api/employers/:refCode` | `deleteEmployerContract` | Delete a contract |
| `GET|POST /api/employer-contract-files` | `listEmployerContractFiles` / `uploadEmployerContractFiles` | Contract documents |
| `GET /api/employer-contract-files/:id/view` / `/:id/download` | `viewEmployerContractFile` / `downloadEmployerContractFile` | Open/download |
| `DELETE /api/employer-contract-files/:id` | `deleteEmployerContractFile` | Delete a document |

**AI, marketing, WhatsApp, workflow and integration endpoints**

| Method + path | Handler | Purpose |
|---|---|---|
| `POST /api/ai/receptionist` | `receptionist` | Website AI receptionist |
| `POST /api/ai/processInquiry` | `processInquiry` | AI enquiry processing |
| `POST /api/pdf-autofill` (also `POST /api/ai/pdf-autofill`) | `pdfAutofill` | Read a bio-data PDF → form JSON |
| `POST /api/ai/hr-interview/chat` · `/session` · `/email` | `hrInterviewChat` · `hrInterviewSession` · `hrInterviewEmail` | AI interviewer |
| `POST /api/ai/hr-interview/schedule` | `scheduleInterview` | Book an interview + notification |
| `POST /api/applicant-assistant/chat` · `GET|POST /tracker` | `chat` / `getTracker` / `createTracker` | Applicant AI assistant |
| `GET /api/ai/direct-marketing/audience` · `POST /generate` · `GET /campaigns` · `GET /campaigns/:id` | `getAudienceOptions` · `generateCampaign` · `getCampaigns` · `getCampaignById` | Marketing campaigns |
| `GET /api/ai/direct-marketing/autonomous/scan` · `POST /autonomous/run` | `autonomousScan` · `autonomousRun` | Autonomous opportunity finder |
| `GET /api/whatsapp/dashboard/metrics` · `/conversations` · `GET|PUT /templates` · `POST /broadcasts` · `POST /inbound` | `getWhatsAppMetrics` · `getWhatsAppConversations` · `getWhatsAppTemplates` · `putWhatsAppTemplate` · `postWhatsAppBroadcast` · `postWhatsAppInbound` | WhatsApp automation |
| `GET /api/whatsapp/candidates/:referenceCode` · `POST /.../messages` · `PATCH /.../stage` | `getWhatsAppCandidateConversation` · `postWhatsAppCandidateMessage` · `patchWhatsAppCandidateStage` | Per-candidate WhatsApp thread |
| `POST /api/events` · `GET /api/events/health` · `GET /api/events` | `createEventController` · `eventHealthController` · `listEventsController` | Workflow event spine (Make.com calls back with the `x-event-secret` header) |
| `GET /api/contractor/tasks` · `POST /api/contractor/tasks/:id/complete` | `listContractorJobs` · `completeContractorJob` | Contractor jobs |
| `POST /api/knowledge/documents` · `GET /api/knowledge/search` | `indexKnowledge` · `searchKnowledge` | SOP/FAQ knowledge base |
| `POST /api/integrations/google-drive/upload-and-sync` · `/google-drive/sync` · `/media/transcribe` | `uploadAndSyncToGoogleDrive` · `syncToGoogleDrive` · `transcribeMedia` | Google Drive + transcription |
| `GET /api/dashboard` · `GET /api/operations-board` · `GET /api/dashboard/authenticated` | `getWorkflowDashboardMetrics` · `getOperationsBoard` | Dashboards |
| `POST /api/match` · `POST /api/schedule` · `POST /api/contracts/generate` | `matchMaids` · `scheduleInterview` · `generateContract` | Matching workflow |
| `GET|PUT /api/employers/:employerId/requirements` | `getRequirements` / `saveRequirements` | Saved employer requirements |
| `POST /api/notify` · `POST /api/send-message` · `POST /api/send-to-make` | `notifyWorkflow` · `sendMessage` · `sendToMake` | Automation triggers |
| `POST /api/tell-friend` | `tellFriend` (rate-limited) | Tell-a-friend email |
| `POST /api/mcp` | `handleMcp` | Model-Context-Protocol endpoint |
| `GET /api/leads` · `POST /api/leads` · `POST /api/leads/raw` | `listLeads` · `createLead` · `ingestRawLead` | Lead workflow |
| `POST /api/inquiry` · `POST /api/inquiry/make` | `handleInquiry` · `handleInquiryForMake` | Inquiry workflow |
| `GET /api/reports/status` · `/sections` · `PUT /config` · `POST /google-sheet/test` · `POST /google-sheet` | (Worker only) | Google Sheets reports |
| Worker-only extras | – | `/api/tiktok/auth-url`, `/api/tiktok/callback`, `/api/tiktok/status`, `/api/tiktok/disconnect`, `/api/agency-auth/bootstrap-reset`, `/api/agency-auth/confirm`, `/api/agency-auth/resend`, `/api/send-to-make` |

### 6.6 Back-end controllers (`backend/src/controllers/*`) — every exported function

| File | Exported functions | What they do |
|---|---|---|
| `agencyAuthController.ts` | `registerAgencyAdmin`, `loginAgencyAdmin`, `getAgencyAdminMe`, `logoutAgencyAdmin`, `changeAgencyAdminPassword`, `createAgencyAdminForAgency` | Agency signup (+6-digit code), login, session check, logout, password change, add staff |
| `agencyDirectoryController.ts` | `listAgencies` | Public agency list |
| `aiController.ts` | `receptionist`, `processInquiry` | Public AI receptionist + AI enquiry processing |
| `pdfAutofillController.ts` | `pdfAutofill` | Proxy a bio-data PDF to Make/OpenAI/Anthropic and return form JSON |
| `hrInterviewController.ts` | `hrInterviewChat`, `hrInterviewSession`, `hrInterviewEmail`, `scheduleInterview` | AI HR interviewer chat/session/email + interview scheduling |
| `applicantAssistantController.ts` | `chat`, `getTracker`, `createTracker` | Applicant AI assistant + tracker |
| `atsController.ts` | `getAtsDashboardController`, `listAtsApplicationsController`, `getUnreadAtsApplicationCountController`, `markAtsApplicationsViewedController`, `getAtsApplicationController`, `syncAtsFromMaidsController`, `updateAtsStageController`, `upsertInterviewController`, `upsertBackgroundCheckController`, `bulkAtsActionController`, `matchAtsApplicationsController`, `listAtsPresetsController`, `saveAtsPresetController`, `createPublicAtsApplicationController`, `getPublicAtsApplicationSummaryController` | The whole ATS board back end |
| `automationController.ts` | `notifyWorkflow`, `sendMessage`, `sendToMake` | Automation triggers (`/api/notify`, `/api/send-message`, `/api/send-to-make`) |
| `chatController.ts` | `getMyChatMessages`, `getMyChatConversations`, `getMyChatSummary`, `sendMyChatMessage`, `clientHeartbeat`, `clientOffline`, `adminHeartbeat`, `adminOffline`, `getMyChatbotConfig`, `postMyChatBotReply`, `getMyChatLastId`, `streamMyChatMessages`, `getAdminChatConversations`, `getAdminChatSummary`, `markAdminNotificationsRead`, `markClientNotificationsRead`, `getAdminChatMessages`, `sendAdminChatMessage`, `getAdminChatbotConfig`, `updateAdminConversationMeta`, `updateAdminChatbotConfig`, `getAdminChatLastId`, `streamAdminChatMessages` | Support + agency chat: read, send, summaries, badges, presence, streaming, chatbot config |
| `clientAuthController.ts` | `registerClient`, `loginClient`, `confirmClientEmail`, `resendClientEmailConfirmation`, `getClientMe`, `updateClientMe`, `logoutClient` | Employer auth |
| `clientController.ts` | `getMyAssignedMaids`, `getMyHistory`, `markMyAssignmentInterested`, `markMyAssignmentDirectHire`, `markMyAssignmentRejected` | Employer portal data + assignment answers |
| `companyController.ts` | `getCompanyProfile`, `getCompanySummary`, `updateCompanyProfile`, `addMOMPersonnel`, `updateMOMPersonnel`, `deleteMOMPersonnel`, `addTestimonial`, `deleteTestimonial` | Agency profile, dashboard summary, MOM personnel, testimonials |
| `contractorController.ts` | `listContractorJobs`, `completeContractorJob` | Contractor task list |
| `dashboardController.ts` | `getWorkflowDashboardMetrics`, `getOperationsBoard` | Dashboard metrics + placement board |
| `directMarketingController.ts` | `getAudienceOptions`, `generateCampaign`, `getCampaigns`, `getCampaignById`, `autonomousScan`, `autonomousRun` | AI marketing campaigns |
| `directSaleController.ts` | `getDirectSales`, `getClientOptions`, `createDirectSale`, `markDirectSaleInterested`, `markDirectSaleDirectHire`, `markDirectSaleRejected` | Direct-sale proposals + client answers |
| `employerContractFileController.ts` | `listEmployerContractFiles`, `uploadEmployerContractFiles`, `viewEmployerContractFile`, `downloadEmployerContractFile`, `deleteEmployerContractFile` | Contract document vault |
| `employerController.ts` | `listEmployerContracts`, `getEmployerContract`, `saveEmployerContract`, `deleteEmployerContract` | Employer contracts |
| `employerRequirementsController.ts` | `getRequirements`, `saveRequirements` | Saved employer requirement templates |
| `enquiryController.ts` | `getEnquiries`, `getUnreadEnquiryCount`, `markEnquiriesViewed`, `createEnquiry`, `updateEnquiry`, `deleteEnquiry`, `extractRawEnquiry` | Enquiry inbox + text extraction |
| `eventController.ts` | `createEventController`, `listEventsController`, `eventHealthController` | Workflow event spine (Make.com callbacks) |
| `inquiryWorkflowController.ts` | `handleInquiry`, `handleInquiryForMake` | Inquiry workflow entry points |
| `integrationController.ts` | `uploadAndSyncToGoogleDrive`, `syncToGoogleDrive`, `transcribeMedia` | Google Drive + transcription |
| `knowledgeController.ts` | `indexKnowledge`, `searchKnowledge` | SOP/FAQ knowledge indexing + semantic search |
| `leadWorkflowController.ts` | `ingestRawLead`, `createLead`, `listLeads` | Lead pipeline |
| `maidController.ts` | `getMaidList`, `getMaidPhotosBatch`, `exportMaidsCsv`, `exportMaidsXls`, `importMaidsCsv`, `importMaidsBatch`, `getMaidByReferenceCode`, `getMaidPhotoPreview`, `getMaidAuthenticatedPhoto`, `getMaidOriginalPhoto`, `bringMaidToTop`, `createMaid`, `updateMaid`, `updateMaidVisibility`, `updateMaidPhoto`, `addMaidPhoto`, `replaceMaidPhotos`, `updateMaidVideo`, `deleteMaid` | Everything about helpers and helper media |
| `matchController.ts` / `matchingWorkflowController.ts` | `matchMaids`, `scheduleInterview`, `generateContract` | Matching, interview scheduling, contract generation |
| `mcpController.ts` | `handleMcp` | MCP (AI tool) endpoint |
| `requestController.ts` | `listRequests`, `getRequest`, `getUnreadRequestCount`, `markRequestsViewed`, `createRequest`, `getRequestStatusCounts`, `patchRequestStatus`, `deleteRequests`, `patchRequestMaids` | Hiring requests |
| `requestMessageController.ts` | `getRequestConversation`, `getRequestMessages`, `postRequestMessage` | Request chat |
| `shareController.ts` | `tellFriend` | Tell-a-friend email |
| `whatsappController.ts` | `getWhatsAppCandidateConversation`, `postWhatsAppCandidateMessage`, `postWhatsAppInbound`, `patchWhatsAppCandidateStage`, `getWhatsAppMetrics`, `getWhatsAppConversations`, `getWhatsAppTemplates`, `putWhatsAppTemplate`, `postWhatsAppBroadcast` | WhatsApp automation |

### 6.7 Back-end services (`backend/src/services/*`) — every exported function

| File | Functions | What they do |
|---|---|---|
| `aiGateway.ts` | `ai` object, types `AiGatewayTask`, `AiGatewayProvider` | Single gateway for all AI tasks (`chat`, `extractDocument`, `translate`, `matchCandidates`) across Make / Anthropic / Gemini / OpenAI-compatible |
| `makeAiEngine.ts` | `callMakeAiEngine(...)` + types | Calls a Make.com AI scenario; falls back to a direct LLM when Make is not configured |
| `aiOrchestratorService.ts` | `processInquiryWithAiOrchestrator(payload)` | Classifies an inquiry, runs matching, logs workflow steps, returns workflow + reply + matches |
| `aiAuditService.ts` | `startAiSession(input)`, `recordAiAction(input)` | Audit trail of every AI session and action |
| `workflowAiService.ts` | `enrichLeadWithAi`, `qualifyLeadWithAi`, `classifyInquiryWithAi`, `rankMatchesWithAi`, `generateContractDraftWithAi` | The five AI steps of the lead/inquiry pipeline |
| `workflowOrchestrationService.ts` | `createStructuredLead`, `processRawLead`, `processInquiryWorkflow`, `runDirectMatchingWorkflow`, `scheduleInterviewWorkflow`, `generateContractWorkflow`, `sendNotificationWorkflow`, `sendMessageWorkflow`, `sendWorkflowToMake`, `getWorkflowDashboard` | Runs the canonical pipeline workflows end to end |
| `workflowMatchingService.ts` | `runMatchingWorkflow(criteria)` | Semantic matching workflow |
| `workflowNameService.ts` | `normalizeWorkflow(name)`, `assertNoLegacyWorkflowResponse(...)` | Maps legacy workflow names onto the canonical ones (see `backend/WORKFLOW_LIST.md`) |
| `workflowNormalizationService.ts` | `normalizeWhitespace`, `normalizeServiceType`, `normalizeUrgency`, `normalizeLocation`, `normalizeBudget`, `extractBudgetFromText`, `extractLocationFromText` | Cleans/normalises messy human input |
| `workflowValidationService.ts` | `requiredString`, `optionalString`, `positiveInteger`, `parseLeadSource`, `parseLeadClassification`, `parseNotificationChannel`, `sanitizePayload` | Input validation for workflow payloads |
| `workflowNotificationService.ts` | `sendWorkflowNotification(payload)` | Email / WhatsApp / internal notifications |
| `workflowLoggerService.ts` | `logWorkflowStep`, `logWorkflowDecision` | Step + decision logging |
| `workflowMakeService.ts` | `sendToMakeWebhook(payload)` | Generic Make.com webhook sender |
| `workflowResponseService.ts` | `buildWorkflowResponse(payload)` | Standard API response shape |
| `eventService.ts` | `recordWorkflowEvent(...)`, `listWorkflowEventsForEntity(...)`, `findMissingFollowupEvents(...)` | The event spine: record events, read timelines, detect silent failures |
| `externalSyncService.ts` | `syncPrivateDocumentToGoogleDrive(input)`, `transcribePrivateMedia(input)` | Hands private documents/audio to Make (which owns the Google credentials) |
| `privateStorageService.ts` | `makePrivateStoragePath`, `isPrivateStorageRef`, `privateStoragePathFromRef`, `uploadPrivateObject`, `createPrivateSignedUrl`, `downloadPrivateObject`, `newPrivateObjectName` | Supabase Storage private-bucket helpers |
| `maidPhotoService.ts` | `readMaidPhotoBytes`, `createBlurredPhotoPreview`, `issueOriginalPhotoToken`, `consumeOriginalPhotoToken` | Blurred public previews + one-time tokens for originals |
| `vectorService.ts` | `embedText`, `cosineSimilarity`, `buildVectorQueryProfile`, `retrieveSemanticMaids`, `indexKnowledgeDocument`, `retrieveKnowledgeSnippets` | Embeddings + semantic search for helper matching and SOP/FAQ knowledge |
| `employerRequirementsService.ts` | `getEmployerRequirements`, `upsertEmployerRequirements`, `applyEmployerRequirements` | Saved employer requirements merged into matching criteria |
| `placementComplianceService.ts` | `getPlacementComplianceRule`, `isPlacementType`, type `PlacementType` | Compliance rules per placement type (`EA_MATCHED`, `ADMIN_ONLY`, `TRANSFER`, `DIRECT_SOURCE`) |
| `financeService.ts` | `calculateFirstMonthSalary`, `calculateRestDayCompensation`, `calculatePlacementLoanBalance`, `calculateAgencyInvoice`, `calculateRefundEligibility` | All money maths (pro-rated salary, rest days, loans, invoices, refunds) |
| `consentService.ts` | `recordConsent`, `withdrawConsent`, `hasActiveConsent`, `filterContactsWithMarketingConsent` | Marketing-consent register (**fail-closed**: no matching consent = no permission) |
| `autonomousMarketingService.ts` | `scanForOpportunities(agencyId)`, `executeOpportunity(...)`, `runAutonomousCampaigns(...)` | Finds holiday/seasonal/audience opportunities and generates the campaigns |
| `directMarketingAiService.ts` | `saveCampaignToMemory`, `getCampaignsByAgency`, `buildAudience`, `generateMarketingCampaign` | Campaign generation + audience building |
| `fallbackClassifier.ts` | `classifyFallback(message)` | Deterministic keyword classifier used when AI is unavailable (complaint/refund/urgent → correct workflow) |

### 6.8 Data stores, repositories, middleware, library and agents

| File / group | Functions / exports | What they do |
|---|---|---|
| `store.ts` — company | `initializeStore`, `getStoreDiagnostics`, `getCompanyBundle`, `updateCompanyProfileStore`, `addMomPersonnelStore`, `updateMomPersonnelStore`, `deleteMomPersonnelStore`, `addTestimonialStore`, `deleteTestimonialStore` | Company profile, MOM personnel, testimonials |
| `store.ts` — helpers | `getMaidsStore`, `getAllMaidsStore`, `getMaidsPageStore`, `getMaidPhotosBatchStore`, `getMaidByReferenceCodeStore`, `getPublicMaidByReferenceCodeStore`, `bulkUpsertMaidRecordsStore`, `createMaidStore`, `updateMaidStore`, `updateMaidVisibilityStore`, `updateMaidPhotoStore`, `addMaidPhotoStore`, `replaceMaidPhotosStore`, `updateMaidVideoStore`, `deleteMaidStore`, `getLegacyMaidSnapshotStore`, `syncMaidsToSqlStore` | Helper CRUD, paging, photos/video, SQL sync |
| `store.ts` — enquiries | `getEnquiriesStore`, `addEnquiryStore`, `updateEnquiryStore`, `deleteEnquiryStore`, `markEnquiriesViewedForAgencyStore` | Enquiry storage |
| `store.ts` — employers | `getClientByEmailStore`, `getClientsStore`, `getClientByTokenStore`, `getOrCreateClientBySupabaseUserStore`, `updateClientStore`, `registerClientStore`, `setClientEmailConfirmationCodeStore`, `confirmClientEmailStore`, `authenticateClientStore`, `createClientSessionStore`, `deleteClientSessionStore` | Employer accounts + sessions |
| `store.ts` — agency admins | `registerAgencyAdminStore`, `authenticateAgencyAdminStore`, `changeAgencyAdminPasswordStore`, `createAgencyAdminSessionStore`, `deleteAgencyAdminSessionStore`, `getAgencyAdminByTokenStore`, `getAgencyAdminSessionByTokenStore`, `getAgencyAdminsStore`, `getAgencySummariesStore`, `getAgencyNameByIdStore` | Agency administrator accounts + sessions |
| `store.ts` — direct sales | `getClientOptionsStore`, `getDirectSalesStore`, `getAllDirectSalesStore`, `createDirectSaleStore`, `getDirectSaleByIdStore`, `updateDirectSaleStatusStore`, `updateDirectSaleStatusForClientStore`, `updateDirectSaleMaidsStore`, `getAssignedMaidsForClientStore`, `getClientHistoryStore` | Direct sales + employer assignments |
| `store.ts` — requests | `ensureRequestConversationStore`, `getRequestConversationByIdStore`, `getRequestMessagesStore`, `createRequestMessageStore` | Request conversations and messages |
| `store.ts` — chat | `getChatMessagesForClientStore`, `getLatestChatMessageIdForClientStore`, `getLatestChatMessageIdForAgencyStore`, `getChatMessagesAfterIdForClientStore`, `getChatMessagesAfterIdForAgencyStore`, `getChatConversationsStore`, `getChatConversationsForClientStore`, `createChatMessageStore`, `markChatMessagesReadForAgencyStore`, `markChatMessagesReadForClientStore`, `getUnreadAgencyChatCountStore`, `getUnreadChatCountForAdminStore`, `getUnreadChatCountForClientStore`, `updateSupportConversationStore`, `getSupportNotificationsStore`, `markSupportNotificationsReadForAgencyStore`, `markSupportNotificationsReadForClientStore`, `touchPresenceStore`, `setPresenceOfflineStore`, `isClientOnlineStore`, `isAgencyOnlineStore`, `getAgencyChatbotConfigStore`, `upsertAgencyChatbotConfigStore` | Chat, unread counts, presence, notifications, chatbot config |
| `store.ts` — contracts | `getEmployerContractsStore`, `getEmployerContractStore`, `saveEmployerContractStore`, `deleteEmployerContractStore`, `getEmployerContractFilesStore`, `getEmployerContractFileStore`, `addEmployerContractFilesStore`, `deleteEmployerContractFileStore` | Employer contracts + document vault |
| `store/workflowStore.ts` | `initializeWorkflowStore`, `listWorkflowLeadsStore`, `createWorkflowLeadStore`, `createWorkflowInquiryStore`, `createWorkflowMatchRecordsStore`, `createWorkflowScheduleStore`, `createWorkflowContractStore`, `createWorkflowNotificationStore`, `createWorkflowAutomationLogStore`, `createWorkflowDecisionLogStore`, `createWorkflowMakeDeliveryStore`, `getWorkflowSnapshotStore` | Persists every workflow artefact (leads, inquiries, matches, schedules, contracts, notifications, logs, Make deliveries) |
| `store/applicantAssistantStore.ts` | `isRequestAlreadyProcessed`, `markRequestProcessed`, `createConversation`, `getConversation`, `addMessageToConversation`, `updateConversationContext`, `listConversationsForAgency`, `createTracker`, `getTracker`, `getActiveTrackerForAgency`, `listTrackersForAgency`, `updateTracker`, `deleteTracker`, `saveGoogleDocLink`, `getGoogleDocLinkForTracker`, `addAuditRecord`, `getAuditLogForAgency` | Applicant-assistant conversations, trackers, Doc links, audit log |
| `atsStore.ts` | `initializeAtsStore`, `ensureApplicationForMaid`, `createPublicAtsApplication`, `getAtsApplication`, `getPublicAtsApplicationSummary`, `getUnreadAtsApplicationCount`, `markAtsApplicationsViewed`, `listAtsApplications`, `upsertInterview`, `upsertBackgroundCheck`, `updateApplicationStage`, `bulkUpdateApplications`, `matchApplicationsToRequirement`, `getAtsDashboard`, `saveAtsFilterPreset`, `getAtsFilterPresets` (+ `RecruitmentStage`, `QualificationCategory` and record types) | The whole ATS data layer |
| `whatsappStore.ts` | `initializeWhatsAppStore`, `getWhatsAppConversationBundle`, `sendWhatsAppMessage`, `receiveWhatsAppInbound`, `updateWhatsAppConversationStage`, `getWhatsAppDashboardMetrics`, `listWhatsAppConversations`, `listWhatsAppTemplates`, `upsertWhatsAppTemplate`, `createWhatsAppBroadcast` (+ message/template/broadcast types) | WhatsApp conversations, messages, templates, broadcasts, metrics |
| `repositories/agencyAdminRepository.ts` | `syncAgencyAdminsFromStoreRecords`, `authenticateAgencyAdminRecord`, `changeAgencyAdminPasswordRecord`, `createAgencyAdminSessionRecord`, `deleteAgencyAdminSessionRecord`, `getAgencyAdminSessionByTokenRecord`, `getAgencyAdminByTokenRecord`, `listAgencySummariesRecord`, `getAgencyNameByIdRecord` | SQL-backed agency-admin authentication |
| `repositories/maidRepository.ts` | `listMaidRecordsSql`, `countMaidRecordsSql`, `listMaidRecordsPageSql`, `getMaidByReferenceCodeSql`, `createMaidSql`, `updateMaidSql`, `updateMaidVisibilitySql`, `updateMaidMediaSql`, `deleteMaidSql`, `upsertMaidRecordsSql`, `getMaidPhotosBatchSql` | SQL-backed helper storage |
| `repositories/requestRepository.ts` | `createRequestRecord`, `listRequestRecords`, `getRequestRecordById`, `getRequestMetricsByAgencyId`, `getUnreadRequestCountByAgencyId`, `markRequestsViewedByAgencyId`, `updateRequestStatusRecord`, `updateRequestMaidsRecord`, `deleteRequestRecords`, `getRequestStatusCountsRecord`, `getConversationByRequestId`, `getConversationById`, `getMessagesByConversationId`, `createMessageRecord` | SQL-backed hiring requests + request chat |
| `middleware/requireAgencyAuth.ts` | `requireAgencyAuth`, `requireContractor`, `requireAgencyRole(...roles)` | Protect agency endpoints and enforce roles |
| `middleware/requireSupabaseAuth.ts` | `requireSupabaseAuth` | Verifies a Supabase JWT for employer endpoints |
| `middleware/rateLimit.ts` | `createRateLimit({...})` | In-memory rate limiter (used by `/api/tell-friend`) |
| `lib/enquiryExtractor.ts` | `extractEnquiry(rawText)`, `formatEnquiryJson(extracted)` (+ `ExtractedEnquiry`, `EnquiryCategory`, `EnquirySeverity`) | Turns a free-text enquiry into structured fields |
| `lib/enquiryToSupportIntegration.ts` | `mapEnquiryToCategory`, `mapUrgencyToPriority`, `formatEnquiryForSupport`, `createSupportConversationFromEnquiry`, `linkEnquiryToConversation`, `generateSupportMessage`, `buildConversationSearchQuery` | Bridges enquiries into the support-chat system |
| `lib/enquiryTestData.ts` | `SAMPLE_ENQUIRIES`, `testEnquiryExtraction()`, `formatEnquiryResponse()`, `batchExtractEnquiries()` | Test fixtures + batch extraction |
| `lib/supabaseAuthVerify.ts` | `verifySupabaseToken(...)`, type `SupabaseAuthUser` | Validates Supabase access tokens |
| `agents/matchingAgent.ts` | `runSemanticMatchingAgent(criteria)` | Retrieves semantic helper candidates, applies compliance rules, AI-ranks them |
| `db.ts` | `sql`, `query`, `getClient`, `initializeDatabase` (+ type `SqlQuery`) | Postgres pool + tagged-SQL helper |
| `auth.ts` | `rememberAgencyAdminSession`, `revokeAgencyAdminSession`, `getAuthenticatedClient`, `getAuthenticatedAgencyAdmin`, `getRequestToken`, `getRequestAgencyId` | Express-side authentication helpers |
| `email.ts` | `sendTellFriendEmail`, `sendClientConfirmationCodeEmail` | Nodemailer/SMTP emails |
| `loadRootEnv.ts` | side-effect import | Loads the repo-root `.env` into the Express server |
| `types/roles.ts` | `AGENCY_ROLES`, `normalizeAgencyRole`, `hasAgencyRole`, `isAgencyAdministrator` | Role constants + checks |
| `types/workflow.ts` | `LeadSource`, `LeadClassification`, `InquiryIntent`, `WorkflowAssignment`, `NotificationChannel`, `AutomationStatus`, `PlacementStatus`, `PlacementRecord`, `LogisticsTaskStatus`, `FlightRecord`, `PlacementLogisticsTask`, `BudgetRange`, `LeadEnrichment`, `LeadQualification`, `StructuredLeadInput`, `WorkflowLeadRecord`, `WorkflowInquiryRecord`, `WorkflowMatchRecord`, `WorkflowScheduleRecord`, `WorkflowContractRecord`, `WorkflowNotificationRecord`, `WorkflowAutomationLogRecord`, `WorkflowDecisionLogRecord`, `WorkflowMakeDeliveryRecord`, `InquiryAutomationResult`, `MatchCriteria`, `MatchCandidate` | Shared workflow/placement types |
| `src/scripts/enquiry-demo.ts` | runnable demo | `npm run demo:enquiry` shows enquiry extraction end to end |

### 6.9 The live Cloudflare Worker (`functions/api/**`)

| File | Key exports / entries | What it does |
|---|---|---|
| `functions/api/[[...path]].ts` (≈14 400 lines) | `export default { fetch(...), scheduled(...) }` | **The production API and host.** `fetch` serves `/api/*`, redirects legacy URLs (`/agencyadmin` → login, `/agency-portal` → `/agencies`, `/user-portal` → client home), injects SEO meta for public routes and answers everything under `/api`. `scheduled` runs the 30-minute cron → `runScheduledAiAutopilot(env)` |
| (same file) — storage helpers | `now`, `stripBom`, `defaultData`, `nextCounter`, `normalizeMaid`, `mergeAppData`, `loadData`, `saveData`, `loadDataFromKv`, `saveDataToKv`, `loadDataFromSupabase`, `saveDataToSupabase`, `loadDataFromSupabaseNormalized`, `saveDataToSupabaseNormalized`, `listMaidsFromSupabaseNormalized`, `listMaidsFromSupabaseAppView`, `getMaidFromSupabaseNormalized`, `getMaidFromSupabaseAppView`, `updateMaidVisibilityInSupabaseNormalized`, `updateMaidMediaInSupabaseNormalized`, `upsertMaidInSupabaseNormalized`, `savePublicAtsApplicationToSupabaseNormalized`, `ensureSupabaseAppDataRow`, `mergeAgencyAdminSessions`, `loadAgencyAdminAuthData`, `saveAgencyAdminAuthData`, `createAgencyAdminSession`, `deleteAgencyAdminSession`, `getAppDataCache`/`putAppDataCache`/`bustAppDataCache` | Storage engine: KV, Supabase blob (`app_data`), normalized tables + in-memory caches |
| (same file) — auth / safety | `requireClientAuth`, `requireAgencyAdminAuth`, `parseAuthorizationToken`, `requireSupabaseConfig`, `toSafeClient`, `toSafeAgencyAdmin`, `jsonError`, `safeApi(...)` | Bearer-token middleware for protected routes + safe error wrapper |
| (same file) — media/upload | `ensureSupabaseStorageBucket`, `uploadFileToSupabaseStorage`, `uploadMaidMediaToSupabaseStorage`, `persistMaidMediaFields`, `buildSupabasePublicFileUrl`, `decodeMaidMediaDataUrl`, `fileToDataUrl`, `sanitizeStoragePathSegment`, `extensionForMimeType` | Uploads photos/documents into Supabase Storage and stores the URLs |
| (same file) — ATS | `filterAtsApplications`, `buildAtsScore`, `buildAtsProfileTags`, `createAtsListItem`, `buildEmploymentHistoryRowsFromFormData`, `toQualificationCategory`, `getAtsProfileByApplicationId`, `shouldInlineAtsDocumentFallback` | ATS list/detail building, scoring, tags |
| (same file) — schedulers | `runScheduledMarketing(env)`, `runScheduledAiAutopilot(env)` | Periodic marketing dispatch + AI autopilot |
| (same file) — API surface | ~170 route registrations | `/api/health`, `/api/events`, `/api/events/health`, `/api/diagnostics`, `/api/enquiries*`, `/api/requests*`, `/api/contractor/tasks*`, `/api/client-auth/*`, `/api/agency-auth/*`, `/api/client/*`, `/api/direct-sales*`, `/api/chats/*`, `/api/ats/*`, `/api/pdf-autofill`, `/api/send-to-make`, `/api/tiktok/*`, `/api/company*`, `/api/maids*`, `/api/employers*`, `/api/reports/*` — this file is what actually answers on the live site |
| `functions/api/fallbackClassifier.ts` | `classifyFallback` | Worker copy of the deterministic fallback classifier |
| `functions/api/services/agencyReports.ts` | `AGENCY_REPORT_SECTIONS`, `AGENCY_REPORT_SECTION_IDS`, `listAgencyReportSections()`, `buildAgencyReportTabs(context)` + types | Defines the 21 report categories and builds one tab per category |
| `functions/api/services/googleSheets.ts` | `parseGoogleServiceAccount`, `extractSpreadsheetId`, `buildSpreadsheetUrl`, `resolveGoogleSheetsCredentials`, `getGoogleSheetsAccessToken`, `listSpreadsheetSheetTitles`, `sanitizeSheetTitle`, `toSheetCellValue`, `writeGoogleSheetsTabs`, `testGoogleSheetsConnection` | Google Sheets client (service-account JWT → batch write tabs) |
| `functions/api/services/ai/agents.ts` | `buildAgentMessages`, `runAIAgent`, `streamAIAgent` | Runs an AI agent, streaming and non-streaming |
| `functions/api/services/ai/autopilot.ts` | `runAiAutopilot(options)` | The autonomous proposal engine used by the cron |
| `functions/api/services/ai/prompts.ts` | `agentDefinitions`, `getAgentDefinition(id)`, types `AiAgentId`, `AiAgentAudience`, `AiAgentDefinition` | System prompts + the agent catalogue (public, employer, agency, admin, applicant) |
| `functions/api/services/ai/tools.ts` | `runAgentTools(context)` + types | The tools an agent may call (search helpers, read enquiries, …) |
| `functions/api/services/ai/groq.ts` | `assertAiRateLimit`, `groqChat`, `groqChatStream`, `parseJsonObject` | Groq (fast/cheap) provider client |
| `functions/api/services/ai/openai.ts` | `assertAiRateLimit`, `openaiChat`, `openaiChatStream`, `parseJsonObject`, `getAiProviderConfig` | OpenAI-compatible provider client (also used for Cline and other hosts) |
| `functions/api/services/ai/embeddings.ts` | `buildMaidText`, `buildRecommendationQuery`, `generateEmbedding`, `upsertMaidEmbedding`, `searchSimilarMaids` | Vector embeddings for helper recommendations (`supabase/maid_embeddings.sql`) |

### 6.10 Scripts (`scripts/*`) and the npm tasks that run them

| Script | npm task | What it does |
|---|---|---|
| `wrangler-deploy.mjs` | `deploy:cf`, `worker:deploy` | Builds and deploys the Worker + static assets to Cloudflare |
| `ai-integration-tests.mjs` | `test:ai`, `test:ai:local`, `test:ai:prod` | AI end-to-end tests against local or production |
| `test-ai-agents-page.mjs`, `test-ai-assistant-command-center.mjs`, `test-ai-live.mjs`, `test-ai-offtopic.mjs`, `test-all-ai-features.mjs` | – | AI smoke tests: agents page, command center, live model, off-topic guardrails, all features |
| `test-website-ai-workflow.mjs` | `test:website-ai` | Public website AI workflow |
| `test-hr-interview-email.mjs`, `test-hr-interview-full.mjs` | `test:hr-email`, `test:hr-full` | AI HR interviewer e-mail + full flow |
| `test-workflow-orchestrator.mjs` | `test:orchestrator` | Workflow orchestrator |
| `test-events.mjs` | `test:events`, `test:events:prod` | Event spine + health check |
| `test-make-webhook.mjs` | `test:make-webhook` | Make.com webhook wiring |
| `test-pdf-autofill.mjs`, `test-pdf-autofill-local.mjs`, `check-pdf-autofill-prod.mjs` | – | PDF autofill extraction tests |
| `test-ats-upload-smoke.mjs` | – | ATS document-upload smoke test |
| `scan-secrets.mjs` | `secrets:scan`, `:all`, `:staged`, `secrets:install-hook` | Blocks secrets from being committed |
| `purge-secret-history.ps1`, `fix-wrangler-auth.ps1` | `secrets:purge-history` | One-off secret/credential repair scripts |
| `check-wrangler.mjs` | – | Verifies Wrangler/Cloudflare credentials |
| `generate-tutorial-ppt.cjs` / `.mjs` | – | Generates the training deck `docs/Helped-Platform-Tutorial-Guide.pptx` |
| `make-fdw-fillable-pdf.js` | – | Builds the fillable FDW bio-data PDF |
| `cleanup-inline-ats-docs.mjs` | `cleanup:ats-inline-docs` | Housekeeping for inlined ATS docs |
| `frontend/scripts/generate-seo-pages.mjs` | part of `frontend:build` | Generates the SEO pages after the Vite build |
| `docs/test-blueprint.mjs` | – | Validates the Make.com blueprints |

---

## Part 7 — Data, storage and database

| Item | Detail |
|---|---|
| Main data | `public.app_data` — one JSON row per app id (`SUPABASE_APP_DATA_TABLE=app_data`, `SUPABASE_APP_DATA_ID=default`) |
| Normalized mode | `helped_*` tables created by `supabase/normalized_project_setup.sql`, switched on with `SUPABASE_USE_NORMALIZED=true` (migrate with `select public.migrate_helped_blob_to_normalized('default');`) |
| KV mode | Cloudflare KV binding `APP_DATA` (`STORAGE_BACKEND=kv`) |
| Files | Supabase Storage buckets (public helper photos + a **private** bucket referenced as `private/...` refs; originals are only handed out via signed URLs / one-time tokens) |
| Vector search | `supabase/maid_embeddings.sql` (helper embeddings) |
| SQL files worth knowing | `supabase/helped_full_production_schema.sql` (full schema), `project_setup.sql`, `requests_rls.sql` (row-level security), `repair_fast_query_schema.sql`, `fix_company_summary_live_counts.sql`, `fix_company_summary_unread_count.sql`, `20260604_chat_fastpath_presence.sql` |
| Local JSON fallback | `backend/data/*.json` (used when nothing else is configured) |
| Env template | `.env.example` documents every variable per file (`.env`, `.dev.vars`, `backend/.env`, `frontend/.env`) |

---

## Part 8 — Environment variables and secrets (what they turn on)

| Group | Variables | Notes |
|---|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_APP_DATA_TABLE`, `SUPABASE_APP_DATA_ID`, `SUPABASE_USE_NORMALIZED` | Service-role key is a **secret** |
| Storage backend | `STORAGE_BACKEND` (`supabase` or `kv`) | `wrangler.toml` currently `supabase` |
| AI providers | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `CLINE_API_KEY`, `CLINE_API_URL`, `CLINE_MODEL`, `AI_AUTOPILOT_ENABLED` | All keys are secrets |
| Make.com | `MAKE_WEBHOOK_URL…` family incl. `_AI_ENGINE`, `_APPLICANT_INTAKE`, `_GOOGLE_DRIVE_SYNC`, `_MEDIA_TRANSCRIBE`, `_HR_EMAIL`, `_PDF_AUTOFILL`, `MAKE_ORCHESTRATOR_WEBHOOK_URL`, `MAKE_PDF_AUTOFILL_WEBHOOK_TOKEN` | Set as Worker secrets |
| Events | `EVENT_INGEST_SECRET` | Shared secret for `POST /api/events` (`x-event-secret`) |
| Email | `RESEND_API_KEY`, `RESEND_FROM`, `DEV_EXPOSE_CONFIRMATION_CODE` | **Never** set `DEV_EXPOSE_CONFIRMATION_CODE=true` in production |
| Google Sheets | `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` (secret, keep on one line), `GOOGLE_SHEETS_SPREADSHEET_ID` | Reports page |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Login Kit |
| Backend only | `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `MAIL_PROVIDER`, `SMTP_*`, `MAIL_*` | `backend/.env` |
| Frontend (public!) | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAKE_WEBHOOK_URL_*` | Anything `VITE_*` ends up in the browser bundle — never a secret |

Useful commands:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
npm run secrets:scan           # before committing
```

---

## Part 9 — What to do when something fails (plain-language runbook)

| Symptom | Likely cause | What to do |
|---|---|---|
| "Invalid username or password" for **everybody** | Normalized admin mode was switched on before migrating (empty `helped_agency_admins`) | Contact the developer; the Worker falls back to main data as a safety net, but the real fix is to migrate then deploy |
| Cannot log in to `/agency` at all | Session expired / token revoked | Log in again; if a reset is needed use `POST /api/agency-auth/bootstrap-reset` (developer) |
| Login asks for a **6-digit code** every time | E-mail never verified for that account | Enter the newest code (15-minute validity) or press **Resend code**; if `delivery: not_configured`, Resend e-mail is not configured → developer |
| New enquiry / request / message **does not appear** | Cached count or wrong browser session | Refresh (badges poll every 5 s). If still missing, check `/api/health` and `/api/diagnostics` |
| Helper photos look blurry on the public site | **By design** — the public preview is deliberately blurred | Originals are visible inside the portal only |
| Helper is not visible on the public website | Helper is **unpublished** (`isPublic = false`) or belongs to another agency | Manage Maids → tick the helper → publish |
| Report push fails with `403 PERMISSION_DENIED` | Spreadsheet not shared with the Google service-account e-mail as Editor | Share the sheet as Editor, then **Test connection** again |
| Report push fails with `404 NOT_FOUND` | Wrong spreadsheet id | Paste the correct id/URL on the Reports page → Save settings |
| "…is not a valid service account key JSON" | `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` missing / truncated / not on one line | Re-run `npx wrangler secret put GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` with the whole file |
| AI answer refused / off-topic | Prompt guardrails | Rephrase; complaints/urgent messages are handled by the deterministic fallback classifier |
| An AI feature returns nothing | Missing AI key or Make webhook | Check the secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `MAKE_*`) and `/api/health` |
| Big document upload fails | Payload too large (API limit 120 MB → `413`) | Compress or split the file |
| The live site shows the **old** version | Deploy not run | `npm run deploy:cf` |
| Site errors after an update | Broken build | Run `npm run build` locally, fix, then re-deploy |
| Suspected leaked secret | A key ended up in git | `npm run secrets:scan`, rotate the key at the provider, then `npm run secrets:purge-history` |
| Applicant cannot check their status | Wrong / expired access token | Re-send the status link from the applicant record |

**Health checks you can open in a browser:** `/api/health` (server + storage), `/api/events/health` (workflow event spine), `/api/diagnostics` (storage mode — needs an agency-admin token).

---

## Part 10 — Related documents and glossary

### 10.1 Other documents in this repository

| Document | Read it for |
|---|---|
| `README.md` | Install, run, deploy, Supabase/KV setup, e-mail + social/phone login setup |
| `docs/GOOGLE_SHEETS_REPORTS.md` | Reports page setup, all 21 tabs, error table |
| `docs/ENQUIRY_INTAKE_SYSTEM.md`, `ENQUIRY_QUICK_REFERENCE.md`, `ENQUIRY_SYSTEM_IMPLEMENTATION.md` | The structured enquiry system |
| `backend/WORKFLOW_LIST.md` | Canonical workflow names + which AI service does what |
| `backend/docs/ai-agents-architecture.md` | AI agent roles (client support agent, staff assistant, operations agent) and their safety rules |
| `backend/docs/make-scenarios.md`, `docs/MAKE_WORKFLOW_ARCHITECTURE.md`, `make/README.md`, `make/SCENARIOS-TO-IMPORT.md`, `MAKE-SETUP.md` | Every Make.com scenario, payloads and import order |
| `docs/TESTING_GUIDE.md` | How to test the platform |
| `docs/ai-agent-architecture.md`, `docs/ai-receptionist-make-migration.md` | AI architecture + receptionist migration |
| `docs/WORKFLOW_DESIGN_PRESENTATION.md`, `docs/Helped-Platform-Tutorial-Guide.pptx` | Presentation / training material for the boss and staff |

### 10.2 Glossary

| Term | Meaning |
|---|---|
| **Helper / maid / FDW** | The domestic worker whose profile is published |
| **Employer / client** | The household that hires a helper |
| **Agency admin / staff** | A user of the agency portal (the boss and the office team) |
| **Enquiry** | A website contact request, before it becomes a formal hiring request |
| **Request** | A formal hiring request from an employer, with a status and its own chat |
| **Direct sale** | A helper proposed directly to an employer (shortlist proposal) |
| **Placement** | A confirmed hire (helper ↔ employer) tracked in Operations |
| **ATS / applicant** | A person applying to work as a helper via `/apply-as-maid` |
| **Contract / employer record** | Employment paperwork plus its attachments |
| **Publish / unpublish** | Make a helper visible (or not) on the public website |
| **Badge** | The red unread counter on Requests / Enquiries / Applicants / Messages |
| **Make.com scenario** | An external automation (AI receptionist, HR interviewer, PDF autofill, Drive sync, transcription, alerts) |
| **Autopilot** | The 30-minute background AI scan that proposes actions for human review |
| **Normalized tables** | The alternative Supabase layout (`helped_*` tables) instead of one JSON blob |
| **REF code** | The short public ID of a helper or contract (`00004`, `00005`, …) |

### 10.3 Document control

| Item | Value |
|---|---|
| Written for | Helped / Find Maid agency platform |
| Source of truth | The code in this repository (`frontend/src`, `backend/src`, `functions/api`) |
| Based on | A full read of the routes, controllers, services, stores, pages and components on the current `main` branch |
| Maintenance rule | Whenever a page, endpoint or menu item is added, renamed or removed, update **Part 5** (staff-facing) and **Part 6** (technical) in the same commit |
























