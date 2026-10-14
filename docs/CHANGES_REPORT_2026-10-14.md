# Helped-web — Change Report

**Author:** jimmuelcunanan-p · **Date:** 14 October 2026 · **Branch:** `main` @ `641a80b`
**Audience:** IT / technical review

---

## 1. Executive summary

Four workstreams, all implemented in **both runtime targets** (Express backend *and*
Cloudflare Worker) so local and production behave identically:

| # | Workstream | Type | Status |
|---|---|---|---|
| 1 | Agency ratings & reviews (replaces a fabricated score) | New feature | Complete, uncommitted |
| 2 | Google review funnel (request section, popup, keyless Maps links) | New feature | Complete, uncommitted |
| 3 | AI Marketing email delivery (real sending + HTML maid cards) | New feature + fix | Complete, uncommitted |
| 4 | Reliability / UX / accessibility fixes (dashboard, chatbot, mail guards) | Fixes | Complete, uncommitted |

**Scope:** 24 modified files (+1,241 / −457) plus 23 new files (~2,600 lines),
including 9 new automated test files and 3 verification scripts.

**Headline:** the platform previously displayed a **hard-coded rating** for every
agency (`4.8` or `4.5`) and its AI-marketing emails were **not being delivered**.
Both are now real, verified behaviours.

---

## 2. Workstream 1 — Agency ratings & reviews

### 2.1 Problem

`frontend/src/lib/agencies.ts` computed the score from the *number of maids*, not
from any user feedback:

```ts
rating: agencyMaids.length > 0 ? 4.8 : 4.5,   // ← fabricated, same for every agency
```

Every agency therefore advertised a near-perfect "experience score", which is
both misleading to employers and a trust/compliance risk for the business.

### 2.2 Solution

A genuine, Google-Maps-style review system:

* A logged-in **client** leaves **one review per agency** (1–5 whole stars + up to
  1,000 characters). Re-submitting **updates** the existing review (upsert).
* Ratings are **publicly readable**; writing and deleting require client auth.
* A client may only delete **their own** review (otherwise `403`).
* The summary exposes the mean score (1 decimal) **and** the 5→1 star
  distribution used by the bar chart.

### 2.3 API surface (identical in Express and Worker)

| Method | Route | Auth | Behaviour |
|---|---|---|---|
| `GET` | `/api/agencies/:agencyId/reviews` | public | `{ summary, reviews }`, newest first |
| `POST` | `/api/agencies/:agencyId/reviews` | client | upsert own review → `201` created / `200` updated |
| `DELETE` | `/api/agencies/:agencyId/reviews/:reviewId` | client | own review only → `403` otherwise |

`GET /api/agencies` now also returns real `rating` and `reviewCount` per agency.

### 2.4 Data model & integrity

New `agencyReviews` collection + `counters.agencyReviews` in the JSON store, with
`id`, `agencyId`, `clientId`, `clientName`, `rating`, `comment`, `createdAt`,
`updatedAt`. Counter initialisation and `mergeAppData` / `mergeAppDataWithBase`
were extended, so concurrent writes from the Worker **cannot drop reviews** or
reuse ids — the same merge strategy already used for maids, contracts and
enquiries.

### 2.5 Frontend

| File | Role |
|---|---|
| `frontend/src/components/AgencyReviews.tsx` (new, 381 lines) | Star summary, distribution bars, review list, write/edit/delete form |
| `frontend/src/components/AgencyReviewsShowcase.tsx` (new, 190 lines) | Public social-proof strip on the landing page; renders nothing when empty |
| `frontend/src/components/AgencyGoogleRating.tsx` (new, 83 lines) | "Rate us on Google" card + keyless map embed |
| `frontend/src/lib/agencies.ts` | `fetchAgencyReviews` / `submitAgencyReview` / `deleteAgencyReview`, new types |
| `frontend/src/components/AgencyCard.tsx`, `pages/AgencyDetailsPage.tsx` | Badge shown **only** when `reviewCount > 0` |

No invented score is rendered anywhere: `rating` is `0` until a real review exists
and every consumer gates on `reviewCount`.


---

## 3. Workstream 2 — Google review funnel

### 3.1 Constraint (important for IT)

**Google exposes no API that submits a star rating or a review.** A review can
only be written by a signed-in Google user inside Google's own UI. Any "auto
review" claim would be false, so this workstream builds only:

1. a **keyless** map embed, and
2. **deep links** into Google's review composer / Maps listing.

Per this repo's policy (`src/vite-env.d.ts`), **no API key is inlined into the
browser bundle**. `VITE_GOOGLE_PLACE_ID` is safe because a Place ID is a public
identifier that already appears in every Maps URL — it is not a secret.

### 3.2 New configuration

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_REVIEW_URL` | Google's own "Ask for reviews" short link (`https://g.page/r/<id>/review`) — opens the star picker directly. **Highest priority.** |
| `VITE_GOOGLE_PLACE_ID` | `ChIJ...` public Place ID; builds the writereview URL when no short link is set. |
| `PUBLIC_SITE_URL` (backend) | Absolute base URL used for maid profile/photo links inside marketing emails. |

`buildGoogleRateUrl()` resolves in priority order: review short link → Place ID
composer → Maps search. Leaving both blank degrades gracefully to a Maps search —
no broken button.

### 3.3 New files

| File | Role |
|---|---|
| `frontend/src/lib/googleMaps.ts` | `getGooglePlaceId`, `getGoogleReviewUrl`, `buildGoogleReviewUrl`, `buildGoogleMapsSearchUrl`, `buildGoogleDirectionsUrl`, `buildGoogleMapsEmbedUrl`, `buildGoogleRateUrl` |
| `frontend/src/lib/reviewRequest.ts` | Per-client `localStorage` flag: "review request already seen" |
| `frontend/src/lib/ratingPrompt.ts` | Per-client `localStorage` flag: "rating popup already seen" |
| `frontend/src/ClientPage/ClientReviewRequest.tsx` | Permanent landing-page section: review CTA + office address/map |
| `frontend/src/ClientPage/ClientRatingPopup.tsx` | Dismissible popup after 20 s, signed-in clients only, once per client |

Storage access is wrapped in `try/catch` and **fails open** (the request simply
shows again) so private-mode browsers never suppress it permanently.

---

## 4. Workstream 3 — AI Marketing email delivery

### 4.1 Problem

The AI Marketing page generated campaign copy, but the email path did not
reliably deliver:

* The deployed **Resend sender/domain was rejected**.
* The **Make.com relay answered `Accepted`** but did not deliver the message.
* Result: an agency could press "send" and nothing arrived — with no error shown.

### 4.2 Solution

| Change | File |
|---|---|
| New generic sender `sendMarketingEmail()` — Resend **or** SMTP, HTML support, per-recipient rate limit, subject/text normalisation | `backend/src/email.ts` |
| New `sendCampaignEmail` controller: resolves the campaign + contact, requires an email address, **enforces the recorded opt-in**, maps config errors to `503` and delivery errors to `502` | `backend/src/controllers/directMarketingController.ts` |
| New route `POST /api/ai/direct-marketing/send-email` | `backend/src/routes/directMarketingRoutes.ts` |
| "Send email" button per message, with spinner + toast; falls back to the `mailto:` draft when the deployment lacks the endpoint (`404`) | `frontend/src/pages/AiDirectMarketingPage.tsx` |

**Compliance:** the send path calls `hasActiveConsent(agencyId, email, 'email')`
and returns `403` unless a recorded opt-in exists — marketing email cannot be
sent to a contact who has not opted in.

### 4.3 HTML emails with real maid cards

`directMarketingAiService.ts` now builds an HTML body alongside the plain text:
featured public maids become cards with **photo + profile link**; all dynamic
values pass through `escapeHtml()` before interpolation, and links are built from
`PUBLIC_SITE_URL`. The WhatsApp/mailto text keeps a plain-text version of the same
list.

### 4.4 Make.com becomes the single AI engine

Marketing copy is now generated **only** through the Make.com AI gateway; the
direct Claude/Groq call paths were removed, leaving the deterministic local
template as the fallback. `aiUsed` and the reported model now reflect the Make
webhook. `docs/make-blueprint-marketing-dispatcher.json` was updated so the email
module is **`gmail:ActionSendMessage`** (sends as the agency Gmail account)
instead of the Resend HTTP module.

---

## 5. Workstream 4 — Fixes, reliability, UX and accessibility

### 5.1 Bug fix — marketing campaign history was empty

`backend/src/repositories/marketingCampaignRepository.ts` pruned history with
`ORDER BY created_at DESC OFFSET 20`. With **20 or fewer** campaigns that returns
**no rows**, so `id NOT IN (...)` matched everything and **deleted the campaign
that had just been inserted** — campaign history and summaries were always empty.

```sql
-- before: OFFSET 20  (empty result set for <= 20 campaigns -> deletes everything)
-- after:  LIMIT 20 inside a subquery -> keeps the newest 20
SELECT id FROM (
  SELECT id FROM marketing_campaigns
  WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 20
) AS keep
```

### 5.2 Mail layer hardening (`backend/src/email.ts`)

* `reply_to` is only sent when a reply address is actually configured (previously
  an empty `reply_to` was posted to Resend).
* `result.rejected` / `result.pending` are now guarded with `Array.isArray()`
  before `.length`, so a provider that omits those fields cannot crash the send.

### 5.3 Client dashboard (`frontend/src/ClientPage/ClientDashboard.tsx`)

* Removed a duplicate `hasActiveClientSession()` redirect that raced the router
  and could bounce an authenticated client to the login page.
* Support-chat links now use the maid's **real `agencyId`** instead of the
  hard-coded `agencyId=1` — messages previously reached the wrong agency.
* Unread-chat polling **skips while the tab is hidden**, cutting idle requests.

### 5.4 Home dashboard (`frontend/src/pages/HomePage.tsx` + new `home-dashboard.css`)

* ~1.9 KB of inline `<style>` extracted to a real stylesheet (maintainability).
* New `hasChartData` / `chartFailed` guards with an explicit **empty state**
  ("No records added in the last six months yet…") instead of a blank chart.
* Chart now exposes `role="img"` + a generated `aria-label` summarising each
  series, so screen readers get the data a colour-only graphic could not convey.

### 5.5 FDW application chatbot

Teal/slate text (`#0E4E5E`, `slate-600/700/800`) replaced with `text-black` on the
header, intro bubble, success panel, labels, consent box and footer note —
improves contrast (WCAG) on the light backgrounds used there.

### 5.6 Housekeeping

`frontend/.esb-tmp-check/` (leftover esbuild output) should be deleted and
gitignored before committing.

---

## 6. Verification

### 6.1 Automated tests

**9 new frontend test files** (Vitest + Testing Library):

| Test file | Covers |
|---|---|
| `agency-reviews.test.tsx` (201 lines) | Summary maths, list, submit/edit/delete, auth errors |
| `agency-reviews-showcase.test.tsx` | Public showcase; hidden when there are no reviews |
| `agency-google-rating.test.tsx` | Rate-CTA priority (review URL → Place ID → search) |
| `agency-card.test.tsx` | Rating badge only when `reviewCount > 0` |
| `client-rating-popup.test.tsx` | Popup timing, once-per-client, dismissal |
| `client-review-request.test.tsx` | Review-request section |
| `google-maps.test.ts` | Every URL builder |
| `review-request.test.ts` | "Seen" flag persistence |
| `home-dashboard.test.tsx` | Dashboard metrics + empty/error states |

`frontend/src/test/setup.ts` gained a `ResizeObserver` stub (jsdom does not
implement it, and recharts' `ResponsiveContainer` throws without it), which
unblocked dashboard tests. The obsolete `operations-center.test.tsx` was removed
and replaced by `home-dashboard.test.tsx`.

**3 new verification scripts:**

| Script | Purpose |
|---|---|
| `scripts/send-marketing-advertisement.mjs` | Sends the real "new arrivals" ad through the backend SMTP path (`node --env-file=backend/.env …`) |
| `scripts/test-ai-marketing-email.mjs` | Probes the AI Marketing endpoints and sends a live test email through the Make pipeline |
| `scripts/test-marketing-make-only.mjs` | Confirms Make.com is the only marketing AI engine |

### 6.2 How to reproduce

```powershell
npm --prefix frontend run test        # Vitest suite
npm --prefix frontend run lint        # ESLint
npm run build                         # production build (frontend)
npm run dev                           # backend + frontend + worker locally
```

**Result on 14 Oct 2026 (full frontend suite):**

```
Test Files  13 passed (13)
     Tests  60 passed (60)
  Duration  60.15s
```

Non-blocking output observed (pre-existing, not caused by these changes): React
Router v7 future-flag warnings, and a recharts "width(0)/height(0)" notice from
jsdom, which has no layout engine.

---

## 7. Impact

| Area | Before | After |
|---|---|---|
| Agency rating | Fabricated `4.8` / `4.5` for **every** agency | Real average + review count, badge hidden until a review exists |
| Employer trust | Misleading social proof | Verifiable reviews from authenticated clients |
| Google presence | No review funnel | "Rate us on Google" CTA + map, once-per-client prompt |
| Marketing email | Rejected sender / silent non-delivery | Delivered via SMTP or the Gmail module, opt-in enforced, HTML maid cards |
| Campaign history | Always empty (pruning bug) | Last 20 campaigns retained correctly |
| Chat routing | All client chat links pinned to agency 1 | Routes to the maid's actual agency |
| Accessibility | Colour-only chart, low-contrast FDW text | `aria-label` chart summary, black-on-light text |

---

## 8. Open items / recommendations

1. **Commit the work** — everything above is still in the working tree (not on
   `main`). Suggested split: reviews → Google funnel → marketing email → fixes.
2. **Configure before deploy:** `VITE_GOOGLE_REVIEW_URL` (or
   `VITE_GOOGLE_PLACE_ID`), `PUBLIC_SITE_URL`, and either `RESEND_*` or the SMTP
   variables (`MAIL_PROVIDER`, `SMTP_*`).
3. **Delete / gitignore** `frontend/.esb-tmp-check/`.
4. **Storage growth:** reviews live in the JSON data store. If review volume
   grows, move them to the Postgres path (there is already a
   `marketing_campaigns` table as precedent).
5. **Commit messages:** all recent commits are titled *"update"*. Adopting
   `feat(scope): …` / `fix(scope): …` (as the other contributor does) would make
   reviews and rollbacks far easier.

---

## 9. Appendix — files touched (uncommitted)

**Modified (24):** `.env.example`, `backend/data/app-data.local.json`,
`backend/data/workflow-data.json`,
`backend/src/controllers/directMarketingController.ts`, `backend/src/email.ts`,
`backend/src/repositories/marketingCampaignRepository.ts`,
`backend/src/routes/agencyDirectoryRoutes.ts`,
`backend/src/routes/directMarketingRoutes.ts`,
`backend/src/services/directMarketingAiService.ts`, `backend/src/store.ts`,
`docs/make-blueprint-marketing-dispatcher.json`,
`frontend/src/ClientPage/ClientDashboard.tsx`,
`frontend/src/ClientPage/ClientLandingPage.tsx`,
`frontend/src/components/AgencyCard.tsx`,
`frontend/src/components/FdwApplicationChatbot.tsx`, `frontend/src/lib/agencies.ts`,
`frontend/src/pages/AgencyDetailsPage.tsx`,
`frontend/src/pages/AiDirectMarketingPage.tsx`,
`frontend/src/pages/FdwApplicationChatPage.tsx`, `frontend/src/pages/HomePage.tsx`,
`frontend/src/test/setup.ts`, `frontend/src/vite-env.d.ts`,
`functions/api/[[...path]].ts`

**Added (23):** `backend/src/controllers/agencyReviewController.ts`,
`frontend/src/ClientPage/ClientRatingPopup.tsx`,
`frontend/src/ClientPage/ClientReviewRequest.tsx`,
`frontend/src/components/AgencyGoogleRating.tsx`,
`frontend/src/components/AgencyReviews.tsx`,
`frontend/src/components/AgencyReviewsShowcase.tsx`,
`frontend/src/lib/googleMaps.ts`, `frontend/src/lib/ratingPrompt.ts`,
`frontend/src/lib/reviewRequest.ts`, `frontend/src/pages/home-dashboard.css`,
the 9 test files in §6.1, and the 3 scripts in §6.1.

**Deleted (1):** `frontend/src/test/operations-center.test.tsx` (superseded).

---

*Companion document: `docs/CHANGES_REPORT_2026-10-14.md`.*
