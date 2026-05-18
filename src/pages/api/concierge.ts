import { randomUUID } from "node:crypto";
import {
  type FetchLike,
  createMaisonClient,
  MaisonForbiddenError,
  MaisonNetworkError,
  MaisonNotFoundError,
  MaisonValidationError,
} from "@maison/sdk";
import type { APIRoute, AstroCookies } from "astro";
import { ChatRequestSchema } from "@features/concierge/domain/validation";

export const prerender = false;

const VISITOR_COOKIE = "maison_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function getOrCreateVisitorId(cookies: AstroCookies): string {
  const existing = cookies.get(VISITOR_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{8,64}$/i.test(existing)) {
    return existing;
  }
  const id = randomUUID();
  cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
  });
  return id;
}

function readMaisonEnv(env: NodeJS.ProcessEnv): { baseUrl: string; tenantSlug: string } | null {
  const baseUrl = env["MAISON_API_URL"];
  const tenantSlug = env["MAISON_TENANT_SLUG"] ?? "fwurtz";
  if (!baseUrl) return null;
  return { baseUrl, tenantSlug };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Widget still sends a full history payload. We extract the latest visitor
  // message and let maison-core own the conversation state.
  const latest = parsed.data.history.at(-1);
  if (!latest || latest.role !== "user") {
    return jsonResponse(
      { error: "invalid_input", message: "history must end with a user message" },
      { status: 400 },
    );
  }

  const env = readMaisonEnv(process.env);
  if (!env) {
    return jsonResponse({ error: "missing_config" }, { status: 503 });
  }

  const client = createMaisonClient({
    baseUrl: env.baseUrl,
    tenant: { slug: env.tenantSlug },
    timeoutMs: 25_000,
    fetch: fetch as FetchLike,
  });
  const visitorId = getOrCreateVisitorId(cookies);

  try {
    const reply = await client.concierge.chat({
      visitorId,
      content: latest.text,
      page: parsed.data.page,
    });
    return jsonResponse({ text: reply.reply, fallback: reply.metadata.fallback === true });
  } catch (err) {
    if (err instanceof MaisonValidationError) {
      return jsonResponse({ error: "invalid_input", upstream: err.body }, { status: 400 });
    }
    if (err instanceof MaisonForbiddenError) {
      return jsonResponse({ error: "tenant_inactive" }, { status: 503 });
    }
    if (err instanceof MaisonNotFoundError) {
      return jsonResponse({ error: "tenant_not_found" }, { status: 503 });
    }
    if (err instanceof MaisonNetworkError) {
      return jsonResponse({ error: "upstream_unreachable" }, { status: 502 });
    }
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }
};

export const GET: APIRoute = () =>
  jsonResponse({ error: "method_not_allowed" }, { status: 405 });
