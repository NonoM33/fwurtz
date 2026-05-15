import type { APIRoute } from "astro";
import { usersRepo } from "@features/users/infra/repository.ts";
import { ROLES } from "@features/users/domain/types.ts";
import type { UserRole } from "@features/users/domain/types.ts";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const role = typeof body.role === "string" && ROLES.includes(body.role as UserRole)
    ? (body.role as UserRole) : undefined;
  const updated = usersRepo().update(id, {
    email: typeof body.email === "string" ? body.email : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
    role,
    avatar: body.avatar === null || typeof body.avatar === "string"
      ? (body.avatar as string | null) : undefined,
  });
  if (!updated) return json({ error: "not_found" }, 404);
  return json({ user: updated });
};

export const DELETE: APIRoute = ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "missing_id" }, 400);
  return usersRepo().remove(id) ? json({ ok: true }) : json({ error: "not_found" }, 404);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
