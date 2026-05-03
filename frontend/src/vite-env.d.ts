/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_CLAUDE_MODEL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_MAKE_WEBHOOK_URL_INQUIRY_PIPELINE?: string;
  readonly VITE_MAKE_WEBHOOK_URL_LEAD_PIPELINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
