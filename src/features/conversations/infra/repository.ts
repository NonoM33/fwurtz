import { randomUUID } from "node:crypto";
import { db } from "~/shared/db/db.ts";
import { ensureMigrated } from "~/shared/db/migrate.ts";
import type {
  ChatMessage,
  Conversation,
  ConversationChannel,
  ConversationStatus,
  ConversationWithLast,
  MessageDirection,
} from "../domain/types.ts";
import { CHANNELS, STATUSES } from "../domain/types.ts";

interface ConvRow {
  id: string;
  channel: string;
  client_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

interface MsgRow {
  id: string;
  conversation_id: string;
  direction: string;
  author: string;
  body: string;
  created_at: string;
}

function convRowToEntity(r: ConvRow): Conversation {
  return {
    id: r.id,
    channel: (CHANNELS.includes(r.channel as ConversationChannel) ? r.channel : "autre") as ConversationChannel,
    clientId: r.client_id,
    visitorName: r.visitor_name,
    visitorEmail: r.visitor_email,
    subject: r.subject,
    status: (STATUSES.includes(r.status as ConversationStatus) ? r.status : "ouvert") as ConversationStatus,
    lastMessageAt: r.last_message_at,
    unreadCount: r.unread_count,
    createdAt: r.created_at,
  };
}

function msgRowToEntity(r: MsgRow): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    direction: (r.direction === "in" || r.direction === "out") ? r.direction : "in",
    author: r.author,
    body: r.body,
    createdAt: r.created_at,
  };
}

export class ConversationsRepository {
  constructor() {
    ensureMigrated();
  }

  list(filter: { status?: ConversationStatus; channel?: ConversationChannel } = {}): ConversationWithLast[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.status) {
      clauses.push("status = @status");
      params["status"] = filter.status;
    }
    if (filter.channel) {
      clauses.push("channel = @channel");
      params["channel"] = filter.channel;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db()
      .prepare<unknown[], ConvRow>(
        `SELECT * FROM conversations ${where} ORDER BY last_message_at DESC`,
      )
      .all(params) as ConvRow[];
    return rows.map((r) => {
      const conversation = convRowToEntity(r);
      const lastRow = db()
        .prepare<unknown[], MsgRow>(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
        )
        .get(r.id) as MsgRow | undefined;
      return {
        conversation,
        lastMessage: lastRow ? msgRowToEntity(lastRow) : null,
      };
    });
  }

  get(id: string): Conversation | null {
    const row = db().prepare<unknown[], ConvRow>("SELECT * FROM conversations WHERE id = ?").get(id) as ConvRow | undefined;
    return row ? convRowToEntity(row) : null;
  }

  upsert(input: {
    id: string;
    channel?: ConversationChannel;
    visitorName?: string | null;
    visitorEmail?: string | null;
    subject?: string | null;
  }): Conversation {
    const existing = this.get(input.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO conversations (id, channel, visitor_name, visitor_email, subject, status, last_message_at, unread_count, created_at)
         VALUES (@id, @channel, @visitorName, @visitorEmail, @subject, 'ouvert', @now, 0, @now)`,
      )
      .run({
        id: input.id,
        channel: input.channel ?? "concierge",
        visitorName: input.visitorName ?? null,
        visitorEmail: input.visitorEmail ?? null,
        subject: input.subject ?? null,
        now,
      });
    const created = this.get(input.id);
    if (!created) throw new Error("failed to read back inserted conversation");
    return created;
  }

  setStatus(id: string, status: ConversationStatus): Conversation | null {
    db().prepare("UPDATE conversations SET status = ? WHERE id = ?").run(status, id);
    return this.get(id);
  }

  markAllRead(id: string): void {
    db().prepare("UPDATE conversations SET unread_count = 0 WHERE id = ?").run(id);
  }

  appendMessage(input: {
    conversationId: string;
    direction: MessageDirection;
    author: string;
    body: string;
  }): ChatMessage {
    const id = randomUUID();
    const now = new Date().toISOString();
    db()
      .prepare(
        `INSERT INTO messages (id, conversation_id, direction, author, body, created_at)
         VALUES (@id, @convId, @direction, @author, @body, @now)`,
      )
      .run({
        id,
        convId: input.conversationId,
        direction: input.direction,
        author: input.author,
        body: input.body,
        now,
      });
    // bump conversation
    if (input.direction === "in") {
      db().prepare("UPDATE conversations SET last_message_at = ?, unread_count = unread_count + 1 WHERE id = ?")
        .run(now, input.conversationId);
    } else {
      db().prepare("UPDATE conversations SET last_message_at = ? WHERE id = ?")
        .run(now, input.conversationId);
    }
    return {
      id,
      conversationId: input.conversationId,
      direction: input.direction,
      author: input.author,
      body: input.body,
      createdAt: now,
    };
  }

  messages(conversationId: string, opts: { sinceIso?: string; limit?: number } = {}): ChatMessage[] {
    const clauses = ["conversation_id = @convId"];
    const params: Record<string, unknown> = { convId: conversationId };
    if (opts.sinceIso) {
      clauses.push("created_at > @since");
      params["since"] = opts.sinceIso;
    }
    const limit = opts.limit ? `LIMIT ${Math.max(1, Math.min(opts.limit, 500))}` : "";
    const rows = db()
      .prepare<unknown[], MsgRow>(
        `SELECT * FROM messages WHERE ${clauses.join(" AND ")} ORDER BY created_at ASC ${limit}`,
      )
      .all(params) as MsgRow[];
    return rows.map(msgRowToEntity);
  }

  /** Outbound messages from staff that the visitor hasn't seen yet. */
  pollOutboundSince(conversationId: string, sinceIso: string): ChatMessage[] {
    const rows = db()
      .prepare<unknown[], MsgRow>(
        `SELECT * FROM messages
         WHERE conversation_id = @convId AND direction = 'out' AND created_at > @since
         ORDER BY created_at ASC`,
      )
      .all({ convId: conversationId, since: sinceIso }) as MsgRow[];
    return rows.map(msgRowToEntity);
  }

  totals(): { open: number; takenOver: number; unread: number } {
    const open = (db().prepare("SELECT COUNT(*) as n FROM conversations WHERE status = 'ouvert'").get() as { n: number }).n;
    const takenOver = (db().prepare("SELECT COUNT(*) as n FROM conversations WHERE status = 'en_cours'").get() as { n: number }).n;
    const unread = (db().prepare("SELECT COALESCE(SUM(unread_count), 0) as n FROM conversations").get() as { n: number }).n;
    return { open, takenOver, unread };
  }
}

let singleton: ConversationsRepository | undefined;
export function conversationsRepo(): ConversationsRepository {
  if (!singleton) singleton = new ConversationsRepository();
  return singleton;
}
