/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // There are deliberately NO VITE_*_API_KEY entries here: any variable with a
  // VITE_ prefix is inlined into the public browser bundle, so API keys must stay
  // server-side (repo-root .env or .dev.vars) and be proxied through the backend.
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  // Google Business Profile Place ID for the agency (e.g. ChIJ...). Powers the
  // "Rate us on Google" button and the map embed on /agencies/:id. A Place ID is
  // a public identifier that already appears in every Maps URL — it is NOT a
  // secret, so unlike an API key it is safe to inline here. Blank = the button
  // falls back to a plain Google Maps search.
  readonly VITE_GOOGLE_PLACE_ID?: string;
  // Google's own review short link for the agency's Business Profile, e.g.
  // https://g.page/r/CfD9XpTa2bDcEAE/review — generated from the Business
  // Profile dashboard ("Ask for reviews"). Public, like the Place ID, and takes
  // priority over it because it opens the star picker directly.
  readonly VITE_GOOGLE_REVIEW_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
