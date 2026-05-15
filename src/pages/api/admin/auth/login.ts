import type { APIRoute } from "astro";
import { authenticate, issueSession } from "@features/admin-auth/infra/sessions.ts";
import { buildSessionCookie } from "@features/admin-auth/infra/cookies.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return json({ error: "missing_credentials" }, 400);
  }
  if (!authenticate(email, password)) {
    return json({ error: "invalid_credentials" }, 401);
  }
  const { token } = issueSession(email);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildSessionCookie(token),
    },
  });
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
