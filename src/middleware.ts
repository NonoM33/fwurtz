import { defineMiddleware } from "astro:middleware";
import { readSessionCookie } from "@features/admin-auth/infra/cookies.ts";
import { verifySession } from "@features/admin-auth/infra/sessions.ts";
import { decideRoute, readRole } from "@features/role/role.ts";

const PUBLIC_ADMIN_PATHS = new Set<string>([
  "/admin",
  "/admin/",
  "/admin/index",
]);

const PUBLIC_API_ADMIN_PATHS = new Set<string>([
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
]);

function envValue(key: string): string | undefined {
  const v =
    (import.meta.env as Record<string, string | undefined>)[key] ??
    process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function parseAllowedOrigins(): ReadonlyArray<string> {
  const raw = envValue("CORS_ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return {};
  if (!requestOrigin) return {};
  if (!allowed.includes(requestOrigin)) return {};
  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cookie",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const role = readRole();

  // 1) Role-based filter — reject anything this container shouldn't serve.
  const decision = decideRoute(role, path);
  if (!decision.allow) {
    return new Response("Not found on this service.", { status: 404 });
  }

  // 2) CORS preflight handling for cross-origin admin/site → backend calls.
  const reqOrigin = context.request.headers.get("origin");
  const cors = corsHeaders(reqOrigin);
  if (context.request.method === "OPTIONS" && Object.keys(cors).length > 0) {
    return new Response(null, { status: 204, headers: cors });
  }

  // 3) Auth gate for /admin/* pages and /api/admin/* (except login/logout).
  const needsAuth =
    (path.startsWith("/admin") && !isPublicAdminPath(path)) ||
    (path.startsWith("/api/admin") && !PUBLIC_API_ADMIN_PATHS.has(path));

  if (needsAuth) {
    const token = readSessionCookie(context.request.headers.get("cookie"));
    const session = verifySession(token);
    if (!session) {
      if (path.startsWith("/api/admin")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json", ...cors },
        });
      }
      return Response.redirect(new URL("/admin", url.origin), 302);
    }
    context.locals.adminEmail = session.email;
  }

  // 4) Continue, then layer CORS headers on the way out for cross-origin reads.
  const response = await next();
  if (Object.keys(cors).length > 0) {
    for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  }
  return response;
});

function isPublicAdminPath(path: string): boolean {
  if (PUBLIC_ADMIN_PATHS.has(path)) return true;
  return path === "/admin" || path === "/admin/";
}
