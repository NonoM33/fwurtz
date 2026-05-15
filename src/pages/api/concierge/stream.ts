import type { APIRoute } from "astro";
import { messageBus } from "@features/conversations/infra/event-bus.ts";
import type { ChatMessage } from "@features/conversations/domain/types.ts";

export const prerender = false;

/**
 * Visitor-side SSE stream. Pushes any outbound message (from staff) to the
 * widget instantly, plus status changes ("en_cours" / "ouvert") so the UI
 * can show "an agent is replying personally" tags. Filters by sessionId.
 */
export const GET: APIRoute = ({ url, request }) => {
  const sessionId = url.searchParams.get("sessionId") ?? "";
  if (!sessionId || sessionId.length < 8) {
    return new Response("missing sessionId", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* controller closed */
        }
      };
      // Initial hello so the widget knows the channel is open.
      send("hello", { sessionId, ts: Date.now() });

      const onMessage = (msg: ChatMessage): void => {
        if (msg.conversationId !== sessionId) return;
        // Only push staff messages — the visitor already has its own and
        // Marie's replies (those arrive in the POST /api/concierge response).
        if (msg.direction === "out" && msg.author !== "marie") {
          send("message", { id: msg.id, text: msg.body, author: msg.author, createdAt: msg.createdAt });
        }
      };
      const onStatus = (e: { conversationId: string; status: string }): void => {
        if (e.conversationId !== sessionId) return;
        send("status", { status: e.status });
      };

      messageBus.on("message", onMessage);
      messageBus.on("status", onStatus);

      // Keep-alive ping so reverse proxies don't drop the connection.
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* ignore */
        }
      }, 25_000);

      const close = (): void => {
        messageBus.off("message", onMessage);
        messageBus.off("status", onStatus);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
};
