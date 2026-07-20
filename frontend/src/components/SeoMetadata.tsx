import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://rinzinagency.com";
const DEFAULT_DESCRIPTION =
  "Find verified domestic helpers in Singapore for housekeeping, infant care, elderly care and family support.";

const pageMetadata: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Find Trusted Maids in Singapore | Rinzin Agency",
    description: DEFAULT_DESCRIPTION,
  },
  "/search-maids": {
    title: "Search Verified Maids in Singapore | Rinzin Agency",
    description: "Browse verified domestic helper profiles and find the right match for your household in Singapore.",
  },
  "/about": {
    title: "About Rinzin Agency | Singapore Maid Agency",
    description: "Learn how Rinzin Agency matches Singapore families with trusted, carefully verified domestic helpers.",
  },
  "/agency": {
    title: "Maid Agency Services in Singapore | Rinzin Agency",
    description: "Explore domestic helper placement and support services from Rinzin Agency in Singapore.",
  },
  "/faq": {
    title: "Maid Hiring FAQ | Rinzin Agency Singapore",
    description: "Answers to common questions about finding, hiring and supporting a domestic helper in Singapore.",
  },
  "/contact": {
    title: "Contact Rinzin Agency | Singapore Maid Agency",
    description: "Contact Rinzin Agency for help finding a verified domestic helper in Singapore.",
  },
  "/apply-as-maid": {
    title: "Apply as a Domestic Helper | Rinzin Agency",
    description: "Apply to join Rinzin Agency's domestic helper recruitment network.",
  },
  "/services/housekeeping": {
    title: "Housekeeping Helpers in Singapore | Rinzin Agency",
    description: "Find trained domestic helpers for cleaning, laundry, cooking and daily household care.",
  },
  "/services/elderly-care": {
    title: "Elderly Care Helpers in Singapore | Rinzin Agency",
    description: "Find compassionate domestic helpers experienced in elderly care and daily assistance.",
  },
  "/services/infant-care": {
    title: "Infant Care Helpers in Singapore | Rinzin Agency",
    description: "Find verified domestic helpers experienced in newborn, infant and toddler care.",
  },
  "/services/kid-care": {
    title: "Child Care Helpers in Singapore | Rinzin Agency",
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
