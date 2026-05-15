import type { APIRoute } from "astro";
import { testimonialsRepo } from "@features/testimonials/infra/repository.ts";

export const prerender = false;

export const GET: APIRoute = () => {
  const items = testimonialsRepo().list();
  return json({ testimonials: items });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const authorName = String(body.authorName ?? "").trim();
  const quote = String(body.quote ?? "").trim();
  if (!authorName || !quote) {
    return json({ error: "missing_fields" }, 400);
  }
  const created = testimonialsRepo().create({
    authorName,
    quote,
    authorRole: typeof body.authorRole === "string" ? body.authorRole : undefined,
    authorOrg: typeof body.authorOrg === "string" ? body.authorOrg : undefined,
    rating: typeof body.rating === "number" ? body.rating : undefined,
    position: typeof body.position === "number" ? body.position : undefined,
    featured: body.featured === true,
    published: body.published === true,
    source: typeof body.source === "string" ? body.source : undefined,
  });
  return json({ testimonial: created }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
