import { z } from "zod";

export const notificationReadSchema = z.object({
  read: z.boolean().default(true),
});
