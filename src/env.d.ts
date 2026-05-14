/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GROQ_API_KEY?: string;
  readonly GROQ_MODEL?: string;
  readonly CONCIERGE_RATE_LIMIT?: string;
  readonly CONCIERGE_RATE_WINDOW_SECONDS?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
