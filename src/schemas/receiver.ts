import { z } from "zod";

const imageDataUrlSchema = z
  .string()
  .trim()
  .regex(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "Invalid image format");

export const receiverProfileUpdateSchema = z.object({
  profileImage: z.union([imageDataUrlSchema.max(3_000_000), z.null()]).optional(),
});
