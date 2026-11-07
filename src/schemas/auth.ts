import { z } from "zod";

import { BLOOD_GROUPS, USER_ROLES } from "@/lib/enums";

export const registerSchema = z.object({
  role: z.enum(USER_ROLES),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(120),
  city: z.string().trim().min(2).max(80),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  cnic: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  lastDonationDate: z.coerce.date().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
});
