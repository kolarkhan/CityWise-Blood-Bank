import { z } from "zod";

export const verifyContactSchema = z.object({
  type: z.enum(["email", "phone"]),
  code: z.string().trim().min(4).max(10),
});
