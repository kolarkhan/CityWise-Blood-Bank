import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  donorId: z.string().trim().optional(),
});

export const conversationMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export const startConversationSchema = z.object({
  donorId: z.string().trim().min(1),
});
