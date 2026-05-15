import { EventEmitter } from "node:events";
import type { ChatMessage, ConversationStatus } from "../domain/types.ts";

/**
 * Process-local pub/sub for conversation events. Producers (the repository)
 * call `messageBus.emit("message", msg)` whenever a message is appended;
 * consumers (the SSE handlers) subscribe and stream events to clients.
 *
 * Single Node process (current Coolify deployment) is enough — if we ever
 * scale to multiple instances we'll swap this for Redis pub/sub.
 */
export interface MessageBusEvents {
  message: ChatMessage;
  status: { conversationId: string; status: ConversationStatus };
}

class MessageBus extends EventEmitter {
  override emit<E extends keyof MessageBusEvents>(event: E, payload: MessageBusEvents[E]): boolean {
    return super.emit(event, payload);
  }
  override on<E extends keyof MessageBusEvents>(
    event: E,
    handler: (payload: MessageBusEvents[E]) => void,
  ): this {
    return super.on(event, handler);
  }
  override off<E extends keyof MessageBusEvents>(
    event: E,
    handler: (payload: MessageBusEvents[E]) => void,
  ): this {
    return super.off(event, handler);
  }
}

export const messageBus = new MessageBus();
// Generous cap because each open browser tab opens one SSE listener.
messageBus.setMaxListeners(500);
