import type { APIRoute } from "astro";
import { ChatRequestSchema } from "@features/concierge/domain/validation";
import { ConciergeError } from "@features/concierge/domain/errors";
import { getConciergeServices } from "@features/concierge/infra/composition";

export const prerender = false;

function clientKey(req: Request, clientAddress: string | undefined): string {
  // Astro exposes Astro.clientAddress; fall back to forwarded headers for proxies.
  if (clientAddress) return clientAddress;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

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

export const POST: APIRoute = async ({ request, clientAddress }) => {
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

  let services: ReturnType<typeof getConciergeServices>;
  try {
    services = getConciergeServices(import.meta.env);
  } catch (err) {
    if (err instanceof ConciergeError && err.code === "missing_config") {
      return jsonResponse({ error: "missing_config" }, { status: 503 });
    }
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }

  const key = clientKey(request, clientAddress);
  if (!services.rateLimiter.tryAcquire(key)) {
    return jsonResponse({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const reply = await services.replyToVisitor(parsed.data);
    return jsonResponse({ text: reply.text });
  } catch (err) {
    if (err instanceof ConciergeError && err.code === "rate_limited") {
      return jsonResponse({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof ConciergeError && err.code === "upstream_unauthorized") {
      return jsonResponse({ error: "upstream_unauthorized" }, { status: 502 });
    }
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }
};

export const GET: APIRoute = () =>
  jsonResponse({ error: "method_not_allowed" }, { status: 405 });
