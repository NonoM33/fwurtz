import type { APIRoute } from "astro";
import { buildClearCookie } from "@features/admin-auth/infra/cookies.ts";

export const prerender = false;

export const POST: APIRoute = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildClearCookie(),
    },
  });
