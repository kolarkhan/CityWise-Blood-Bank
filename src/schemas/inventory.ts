import { z } from "zod";

import { BLOOD_GROUPS } from "@/lib/enums";

export const inventoryCreateSchema = z.object({
  bankId: z.string().trim().optional(),
  city: z.string().trim().min(2).max(80),
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.coerce.number().int().min(0).max(5000),
  expiryDate: z.coerce.date(),
  batchId: z.string().trim().max(80).optional(),
});

export const inventoryUpdateSchema = z.object({
  units: z.coerce.number().int().min(0).max(5000).optional(),
  expiryDate: z.coerce.date().optional(),
  batchId: z.string().trim().max(80).optional(),
});
