import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const key = process.env.GROQ_API_KEY ?? "";
  const len = key.length;
  const preview = key.length > 10 ? `${key.slice(0, 5)}…${key.slice(-5)}` : "(empty)";

  let raw: string;
  let status = 0;
  let bodyText = "";
  let headers: Record<string, string> = {};
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
    });
    status = r.status;
    bodyText = (await r.text()).slice(0, 800);
    r.headers.forEach((v, k) => { headers[k] = v; });
    raw = "ok";
  } catch (err) {
    raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return new Response(
    JSON.stringify({
      keyLength: len,
      keyPreview: preview,
      groqStatus: status,
      groqBody: bodyText,
      groqHeaders: headers,
      fetchError: raw,
    }, null, 2),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
