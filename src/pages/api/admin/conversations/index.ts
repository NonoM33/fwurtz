import type { APIRoute } from "astro";
import { conversationsRepo } from "@features/conversations/infra/repository.ts";
import { STATUSES, CHANNELS } from "@features/conversations/domain/types.ts";
import type { ConversationChannel, ConversationStatus } from "@features/conversations/domain/types.ts";

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const filter: { status?: ConversationStatus; channel?: ConversationChannel } = {};
  if (status && STATUSES.includes(status as ConversationStatus)) filter.status = status as ConversationStatus;
  if (channel && CHANNELS.includes(channel as ConversationChannel)) filter.channel = channel as ConversationChannel;
  const conversations = conversationsRepo().list(filter);
  const totals = conversationsRepo().totals();
  return json({ conversations, totals });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
