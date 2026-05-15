import type { APIRoute } from "astro";
import { messageBus } from "@features/conversations/infra/event-bus.ts";
import type { ChatMessage } from "@features/conversations/domain/types.ts";

export const prerender = false;

/**
 * Admin-side SSE stream. Two modes:
 *   ?conversationId=X — only events for one conversation (chat panel).
 *   no filter         — every event (list view, badges, notifications).
 */
export const GET: APIRoute = ({ url, request }) => {
  const conversationId = url.searchParams.get("conversationId") ?? null;

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
      send("hello", { ts: Date.now() });

      const onMessage = (msg: ChatMessage): void => {
        if (conversationId && msg.conversationId !== conversationId) return;
        send("message", {
          id: msg.id,
          conversationId: msg.conversationId,
          direction: msg.direction,
          author: msg.author,
          body: msg.body,
          createdAt: msg.createdAt,
        });
      };
      const onStatus = (e: { conversationId: string; status: string }): void => {
        if (conversationId && e.conversationId !== conversationId) return;
        send("status", e);
      };

      messageBus.on("message", onMessage);
      messageBus.on("status", onStatus);

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
