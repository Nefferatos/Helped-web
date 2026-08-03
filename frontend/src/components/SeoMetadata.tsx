import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://rinzinagency.com";
const DEFAULT_DESCRIPTION =
  "Find verified North East Indian and Indian Nepali domestic helpers from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam in Singapore.";
const DEFAULT_KEYWORDS = [
  "Darjeeling maid Singapore",
  "Manipur maid Singapore",
  "Sikkim maid Singapore",
  "Mizoram maid Singapore",
  "Arunachal Pradesh maid Singapore",
  "Assam maid Singapore",
  "North East Indian maid Singapore",
  "NE Indian maid Singapore",
  "Indian Nepali maid Singapore",
  "domestic helper Singapore",
].join(", ");

const pageMetadata: Record<string, { title: string; description: string }> = {
  "/": {
    title: "AT The Agency (formerly Rinzin Agency)",
    description: DEFAULT_DESCRIPTION,
  },
  "/search-maids": {
    title: "Search North East Indian Maids Singapore | AT The Agency",
    description: "Browse verified NE Indian and Indian Nepali helpers from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam.",
  },
  "/about": {
    title: "North East Indian Maid Specialists | AT The Agency",
    description: "Meet Singapore's North East Indian maid specialists recruiting from Darjeeling, Manipur, Sikkim, Mizoram, Arunachal Pradesh and Assam.",
  },
  "/agency": {
    title: "Maid Agency Services in Singapore | AT The Agency",
    description: "Explore domestic helper placement and support services from AT The Agency in Singapore.",
  },
  "/faq": {
    title: "Maid Hiring FAQ | AT The Agency Singapore",
    description: "Answers to common questions about finding, hiring and supporting a domestic helper in Singapore.",
  },
  "/enquiry2": {
    title: "Maid Agency Enquiry | AT The Agency Singapore",
    description: "Send an enquiry to AT The Agency for help finding a suitable domestic helper in Singapore.",
  },
  "/apply-as-maid": {
    title: "Apply as a Domestic Helper | AT The Agency",
    description: "Apply to join AT The Agency's domestic helper recruitment network.",
  },
  "/services/housekeeping": {
    title: "Housekeeping Helpers in Singapore | AT The Agency",
    description: "Find trained domestic helpers for cleaning, laundry, cooking and daily household care.",
  },
  "/services/elderly-care": {
    title: "Elderly Care Helpers in Singapore | AT The Agency",
    description: "Find compassionate domestic helpers experienced in elderly care and daily assistance.",
  },
  "/services/infant-care": {
    title: "Infant Care Helpers in Singapore | AT The Agency",
    description: "Find verified domestic helpers experienced in newborn, infant and toddler care.",
  },
  "/services/kid-care": {
    title: "Child Care Helpers in Singapore | AT The Agency",
    description: "Find trusted domestic helpers experienced in child care, routines and family support.",
  },
};

const noIndexPrefixes = [
  "/agencyadmin",
  "/auth",
  "/client",
  "/employer-login",
  "/hire/",
  "/search-maids/results",
  "/apply-as-maid/status",
];

const upsertMeta = (
  selector: string,
  identityAttribute: "name" | "property",
  identityValue: string,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(identityAttribute, identityValue);
    document.head.appendChild(element);
  }
  element.content = content;
};

const SeoMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    const metadata = pageMetadata[normalizedPath] ?? pageMetadata["/"];
    const canonicalUrl = `${SITE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`;
    const shouldNoIndex = noIndexPrefixes.some((prefix) => normalizedPath.startsWith(prefix));

    document.title = metadata.title;
    upsertMeta('meta[name="description"]', "name", "description", metadata.description);
    upsertMeta('meta[name="keywords"]', "name", "keywords", DEFAULT_KEYWORDS);
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      shouldNoIndex ? "noindex, nofollow" : "index, follow",
    );
    upsertMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    upsertMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      metadata.description,
    );
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
};

export default SeoMetadata;
