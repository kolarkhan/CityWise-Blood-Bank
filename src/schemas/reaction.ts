import { z } from "zod";

export const donorReactionSchema = z.object({
  reaction: z.union([z.literal(1), z.literal(-1)]),
});

