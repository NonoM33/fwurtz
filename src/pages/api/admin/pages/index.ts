import type { APIRoute } from "astro";
import { pagesRepo } from "@features/pages/infra/repository.ts";

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ pages: pagesRepo().list() }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
