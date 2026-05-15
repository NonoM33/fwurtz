/**
 * APP_ROLE — selects which subset of routes this container should serve.
 *
 * Three production roles + a dev-friendly default:
 *
 *   - "site"     : public marketing pages + the chat concierge endpoint.
 *                  Rejects /admin/* and /api/admin/* and /api/media/* and /api/image-slots/*.
 *                  Image slots on the site fetch the public backend (PUBLIC_API_URL).
 *
 *   - "admin"    : back-office UI + admin APIs.
 *                  Serves /admin/* and /api/admin/*.
 *                  Also serves /api/media/* and /api/image-slots/* so the admin pages
 *                  (medias.astro) can preview thumbnails without crossing origins.
 *                  Rejects all marketing routes.
 *
 *   - "api"      : public, read-only API surface for site visitors.
 *                  Serves /api/image-slots/* and /api/media/*.
 *                  Optionally also /api/concierge if you want to centralize.
 *                  Rejects /admin/* and /api/admin/* and marketing routes.
 *
 *   - "all"      : default for local dev — no filtering, every route is reachable.
 */
export type AppRole = "site" | "admin" | "api" | "all";

const VALID_ROLES = new Set<AppRole>(["site", "admin", "api", "all"]);

export function readRole(): AppRole {
  const raw =
    (import.meta.env as Record<string, string | undefined>).APP_ROLE ??
    process.env.APP_ROLE;
  const normalized = (raw ?? "all").trim().toLowerCase() as AppRole;
  return VALID_ROLES.has(normalized) ? normalized : "all";
}

/**
 * Decide whether the current container should serve this path.
 * Returns null if it should pass through, or a 404-style decision otherwise.
 */
export interface RouteDecision {
  allow: boolean;
}

export function decideRoute(role: AppRole, path: string): RouteDecision {
  if (role === "all") return { allow: true };

  // Always allowed regardless of role: assets, favicon, OG, etc.
  if (
    path === "/favicon.svg" ||
    path === "/robots.txt" ||
    path.startsWith("/_astro/") ||
    path.startsWith("/_image")
  ) {
    return { allow: true };
  }

  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isAdminApi = path.startsWith("/api/admin");
  const isMediaApi =
    path.startsWith("/api/media") || path.startsWith("/api/image-slots");
  const isConciergeApi = path.startsWith("/api/concierge");
  const isOtherApi = path.startsWith("/api/");

  switch (role) {
    case "site":
      if (isAdminPage || isAdminApi) return { allow: false };
      if (isMediaApi) return { allow: false };
      if (isConciergeApi) return { allow: true };
      // Reject any other /api/ that isn't above (defense in depth).
      if (isOtherApi && !isConciergeApi) return { allow: false };
      return { allow: true };

    case "admin":
      if (isAdminPage || isAdminApi) return { allow: true };
      if (isMediaApi) return { allow: true };
      // Admin shouldn't serve the marketing site or concierge.
      return { allow: false };

    case "api":
      if (isMediaApi) return { allow: true };
      if (isConciergeApi) return { allow: true };
      // Admin pages/APIs are intentionally NOT served by the public backend.
      return { allow: false };

    default:
      return { allow: true };
  }
}
