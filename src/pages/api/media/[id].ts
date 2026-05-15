import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response("missing id", { status: 400 });
  const file = await mediaStorage().readBinary(id);
  if (!file) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "cache-control": "public, max-age=86400, immutable",
    },
  });
};
