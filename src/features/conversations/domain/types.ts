export type ConversationChannel = "concierge" | "formulaire" | "email" | "autre";
export type ConversationStatus = "ouvert" | "en_cours" | "clos";
export type MessageDirection = "in" | "out";

export const CHANNELS: ReadonlyArray<ConversationChannel> = [
  "concierge", "formulaire", "email", "autre",
];
export const STATUSES: ReadonlyArray<ConversationStatus> = ["ouvert", "en_cours", "clos"];

export const STATUS_LABELS: Readonly<Record<ConversationStatus, string>> = {
  ouvert: "Marie répond",
  en_cours: "Pris en main",
  clos: "Clos",
};

export interface Conversation {
  id: string;
  channel: ConversationChannel;
  clientId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorIpHash: string | null;
  userAgent: string | null;
  startedPage: string | null;
  subject: string | null;
  status: ConversationStatus;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  author: string; // 'visitor' / 'marie' / user_id
  body: string;
  createdAt: string;
}

export interface ConversationWithLast {
  conversation: Conversation;
  lastMessage: ChatMessage | null;
}
