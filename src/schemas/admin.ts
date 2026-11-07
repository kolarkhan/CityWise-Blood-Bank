import { z } from "zod";

export const blockUserSchema = z.object({
  isBlocked: z.boolean(),
});
