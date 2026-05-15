/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GROQ_API_KEY?: string;
  readonly GROQ_MODEL?: string;
  readonly CONCIERGE_RATE_LIMIT?: string;
  readonly CONCIERGE_RATE_WINDOW_SECONDS?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly APP_ENV?: string;
  readonly ADMIN_EMAIL?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly ADMIN_SESSION_SECRET?: string;
  readonly MEDIA_DIR?: string;
  readonly APP_ROLE?: "site" | "admin" | "api" | "all";
  readonly PUBLIC_API_URL?: string;
  readonly CORS_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    adminEmail?: string;
  }
}
