import { z } from 'zod';

// Only user/assistant history can cross the HTTP boundary. System prompts,
// credentials and tool definitions are always selected on the server.
export const chatbotRequestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine((value) => value.messages.at(-1)?.role === 'user', {
    message: 'Son mesaj kullanıcıya ait olmalı.',
  });
export type ChatbotRequest = z.infer<typeof chatbotRequestSchema>;
export type ChatbotSource = { title: string; href: string };
export type ChatbotReply = { answer: string; sources: ChatbotSource[] };

export const publicContextSchema = z
  .object({
    club: z.object({ name: z.string(), about: z.string().max(2400) }).strict(),
    events: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().max(160),
            description: z.string().max(2400),
            date: z.string(),
            location: z.string().max(240),
            href: z.string(),
          })
          .strict(),
      )
      .max(30),
    team: z
      .array(
        z
          .object({
            name: z.string().max(120),
            role: z.string().max(160),
            href: z.string(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type PublicChatbotContext = z.infer<typeof publicContextSchema>;
