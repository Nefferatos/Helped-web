/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // There are deliberately NO VITE_*_API_KEY entries here: any variable with a
  // VITE_ prefix is inlined into the public browser bundle, so API keys must stay
  // server-side (repo-root .env or .dev.vars) and be proxied through the backend.
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
