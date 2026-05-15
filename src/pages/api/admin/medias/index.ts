import type { APIRoute } from "astro";
import { mediaStorage } from "@features/media/infra/storage.ts";
import { MediaError } from "@features/media/domain/errors.ts";
import type { MediaCollection } from "@features/media/domain/types.ts";
import { COLLECTIONS } from "@features/media/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = async () => {
  const list = await mediaStorage().list();
  return json({ medias: list });
};

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "expected_multipart" }, 400);
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "missing_file" }, 400);
  }
  const alt = (form.get("alt") ?? "").toString();
  const collectionRaw = (form.get("collection") ?? "").toString();
  const collection = COLLECTIONS.includes(collectionRaw as MediaCollection)
    ? (collectionRaw as MediaCollection)
    : undefined;

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const asset = await mediaStorage().upload(
      collection
        ? { filename: file.name, contentType: file.type, bytes, alt, collection }
        : { filename: file.name, contentType: file.type, bytes, alt },
    );
    return json({ media: asset }, 201);
  } catch (err) {
    if (err instanceof MediaError) {
      return json({ error: err.code, message: err.message }, 400);
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
