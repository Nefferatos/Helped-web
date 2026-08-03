import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(projectDir, "dist");
const template = await readFile(join(distDir, "index.html"), "utf8");

const pages = [
  {
    path: "/",
    title: "North East Indian Maid Agency Singapore | AT The Agency",
    description: "Find verified North East Indian and Indian Nepali domestic helpers from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam in Singapore.",
    heading: "Verified domestic helpers for Singapore families",
    copy: "AT The Agency, formerly Rinzin Agency, matches Singapore households with verified domestic helpers and provides recruitment, placement and after-placement support.",
  },
  {
    path: "/search-maids",
    title: "Search Verified Domestic Helpers in Singapore | AT The Agency",
    description: "Browse verified North East Indian, Indian Nepali, Filipino, Indonesian and Myanmar domestic helpers available through AT The Agency in Singapore.",
    heading: "Search verified domestic helpers in Singapore",
    copy: "Compare available helpers by nationality, experience and household-care skills. AT The Agency supports Singapore families through selection, placement and after-placement care.",
  },
  {
    path: "/about",
    title: "North East Indian Maid Specialists | AT The Agency Singapore",
    description: "Learn about AT The Agency, a Singapore employment agency specializing in verified North East Indian and Indian Nepali domestic helpers.",
    heading: "About AT The Agency",
    copy: "Formerly Rinzin Agency, AT The Agency helps Singapore employers find suitable domestic helpers, with specialist recruitment from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam.",
  },
  {
    path: "/agency",
    title: "Maid Agency Services in Singapore | AT The Agency",
    description: "Explore domestic-helper recruitment, matching, placement and support services from AT The Agency in Singapore.",
    heading: "Domestic-helper agency services in Singapore",
    copy: "Our team assists employers with helper selection, compatibility matching, placement administration and continued support throughout the employment journey.",
  },
  {
    path: "/faq",
    title: "Domestic Helper Hiring FAQ | AT The Agency Singapore",
    description: "Get answers about finding, hiring and supporting a domestic helper through AT The Agency in Singapore.",
    heading: "Domestic-helper hiring questions answered",
    copy: "Read practical answers about helper selection, eligibility, placement steps, interviews, documentation and support after placement.",
  },
  {
    path: "/enquiry2",
    title: "Maid Agency Enquiry | AT The Agency Singapore",
    description: "Send an enquiry to AT The Agency for help finding a suitable domestic helper in Singapore.",
    heading: "Tell us what kind of helper your household needs",
    copy: "Share your care needs, household preferences and preferred experience. Our placement team will review your enquiry and help identify suitable candidates.",
  },
  {
    path: "/apply-as-maid",
    title: "Apply as a Domestic Helper | AT The Agency Singapore",
    description: "Apply to join AT The Agency's domestic-helper recruitment network for placement opportunities in Singapore.",
    heading: "Apply as a domestic helper",
    copy: "Submit your experience, skills and employment information for review by the AT The Agency recruitment team.",
  },
  {
    path: "/services/housekeeping",
    title: "Housekeeping Helpers in Singapore | AT The Agency",
    description: "Find domestic helpers experienced in cleaning, laundry, cooking and everyday household organization in Singapore.",
    heading: "Housekeeping helpers for Singapore homes",
    copy: "Find helpers with experience in routine cleaning, laundry, meal preparation, household organization and maintaining a safe, comfortable home.",
  },
  {
    path: "/services/elderly-care",
    title: "Elderly Care Helpers in Singapore | AT The Agency",
    description: "Find compassionate domestic helpers experienced in elderly care, companionship and daily assistance in Singapore.",
    heading: "Domestic helpers experienced in elderly care",
    copy: "Explore candidates with relevant experience supporting seniors with daily routines, mobility, companionship, meal preparation and household needs.",
  },
  {
    path: "/services/infant-care",
    title: "Infant Care Helpers in Singapore | AT The Agency",
    description: "Find verified domestic helpers experienced in newborn, infant and toddler care for Singapore families.",
    heading: "Domestic helpers experienced in infant care",
    copy: "Find candidates familiar with feeding routines, bathing, sleep schedules, hygiene, safe supervision and everyday support for families with young children.",
  },
  {
    path: "/services/kid-care",
    title: "Child Care Helpers in Singapore | AT The Agency",
    description: "Find domestic helpers experienced in child care, school routines, meals and safe supervision in Singapore.",
    heading: "Domestic helpers experienced in child care",
    copy: "Explore helpers who can support school routines, meals, play, household organization and attentive supervision for growing children.",
  },
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const navigation = `
  <nav aria-label="Public website pages">
    <a href="/">Home</a>
    <a href="/search-maids">Search Maids</a>
    <a href="/services/housekeeping">Housekeeping</a>
    <a href="/services/elderly-care">Elderly Care</a>
    <a href="/services/infant-care">Infant Care</a>
    <a href="/services/kid-care">Child Care</a>
    <a href="/about">About</a>
    <a href="/faq">FAQ</a>
    <a href="/enquiry2">Enquire</a>
  </nav>`;

// Keep the route-specific HTML available to crawlers and screen readers without
// flashing the unstyled snapshot while the React application is starting.
const snapshotStyles = `<style id="seo-snapshot-styles">
  .seo-snapshot {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
</style>`;

for (const page of pages) {
  const canonical = `https://rinzinagency.com${page.path}`;
  const content = `<main class="seo-snapshot"><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.copy)}</p>${navigation}</main>`;
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s, `$1${escapeHtml(page.description)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/s, `$1${escapeHtml(page.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/s, `$1${escapeHtml(page.description)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/s, `$1${canonical}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/s, `$1${canonical}$2`)
    .replace("</head>", `${snapshotStyles}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`);

  const outputPath = page.path === "/"
    ? join(distDir, "index.html")
    : join(distDir, page.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}

console.log(`Generated ${pages.length} crawlable public route snapshots.`);
