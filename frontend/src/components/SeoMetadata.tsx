import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://rinzinagency.com";
const DEFAULT_DESCRIPTION =
  "Find North East Indian, Nepalese, Myanmar, Indonesian and Filipino domestic helpers in Singapore with Rinzin Agency, also known as At The Agency.";

const pageMetadata: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Find Trusted Maids in Singapore | Rinzin Agency",
    description: DEFAULT_DESCRIPTION,
  },
  "/search-maids": {
    title: "Search Maids & Domestic Helpers Singapore | Rinzin Agency",
    description: "Browse fresh, transfer and ex-Singapore domestic helpers from India, Nepal, Myanmar, Indonesia and the Philippines.",
  },
  "/about": {
    title: "North East Indian Maid Specialists | Rinzin Agency",
    description: "Rinzin Agency, also known as At The Agency, recruits domestic helpers from North East India, Nepal, Myanmar, Indonesia and the Philippines.",
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
