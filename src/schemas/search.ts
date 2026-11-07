import { z } from "zod";

import { BLOOD_GROUPS } from "@/lib/enums";

export const searchSchema = z.object({
  city: z.string().trim().min(2).max(80),
  bloodGroup: z.enum(BLOOD_GROUPS),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
