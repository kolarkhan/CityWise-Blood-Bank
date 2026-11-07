import { z } from "zod";

import { BLOOD_GROUPS } from "@/lib/enums";

const imageDataUrlSchema = z
  .string()
  .trim()
  .regex(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "Invalid image format");

export const donorProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().max(300).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  cnic: z.string().trim().max(30).optional(),
  profileImage: z.union([imageDataUrlSchema.max(3_000_000), z.null()]).optional(),
  lastDonationDate: z.coerce.date().optional(),
  geo: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .optional(),
});

export const donorAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
