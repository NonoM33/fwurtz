import { z } from "zod";

const ROLE = z.union([z.literal("user"), z.literal("concierge")]);

export const PageContextSchema = z.union([
  z.literal("accueil"),
  z.literal("services"),
  z.literal("sites-web"),
  z.literal("gestion"),
  z.literal("juridique"),
  z.literal("evenementiel"),
  z.literal("apropos"),
  z.literal("processus"),
  z.literal("contact"),
  z.literal("ressources"),
]);

const MessageSchema = z.object({
  role: ROLE,
  text: z.string().trim().min(1).max(2_000),
});

export const ChatRequestSchema = z.object({
  /** Last 16 messages of the conversation, oldest first. */
  history: z.array(MessageSchema).min(1).max(32),
  /** Page the visitor is on — drives a contextual greeting. */
  page: PageContextSchema.default("accueil"),
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
