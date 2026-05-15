import type { APIRoute } from "astro";
import { usersRepo } from "@features/users/infra/repository.ts";
import { ROLES } from "@features/users/domain/types.ts";
import type { UserRole } from "@features/users/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = () => {
  return json({ users: usersRepo().list() });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "viewer") as UserRole;
  if (!email || !email.includes("@")) return json({ error: "invalid_email" }, 400);
  if (!name) return json({ error: "missing_name" }, 400);
  if (!ROLES.includes(role)) return json({ error: "invalid_role" }, 400);
  try {
    const user = usersRepo().create({
      email,
      name,
      role,
      password: typeof body.password === "string" ? body.password : undefined,
    });
    return json({ user }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "email_taken") {
      return json({ error: "email_taken" }, 409);
    }
    return json({ error: "internal_error" }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
