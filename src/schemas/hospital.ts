import { z } from "zod";

const imageDataUrlSchema = z
  .string()
  .trim()
  .regex(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "Invalid image format");

export const hospitalProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(300).optional(),
  profileImage: imageDataUrlSchema.max(3_000_000).optional(),
  coverImage: imageDataUrlSchema.max(4_500_000).optional(),
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});
