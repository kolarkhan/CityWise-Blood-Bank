import { addDays, startOfDay } from "date-fns";
import { z } from "zod";

import { APPOINTMENT_STATUSES, BLOOD_GROUPS, REQUEST_STATUSES, REQUEST_URGENCY } from "@/lib/enums";

export const createRequestSchema = z.object({
  patientName: z.string().trim().min(2).max(120),
  hospitalName: z.string().trim().max(120).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.coerce.number().int().min(1).max(20),
  city: z.string().trim().min(2).max(80),
  urgency: z.enum(REQUEST_URGENCY),
  contactPhone: z.string().trim().min(8).max(20),
  neededByDate: z.coerce
    .date()
    .refine((date) => date >= startOfDay(new Date()), "neededByDate cannot be in the past"),
  maxEmergencyAcceptances: z.coerce.number().int().min(1).max(10).default(3).optional(),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
});

export const appointmentCreateSchema = z.object({
  requestId: z.string().trim().min(1),
  donorId: z.string().trim().min(1),
  bankId: z.string().trim().min(1).optional(),
  scheduledAt: z.coerce
    .date()
    .refine((date) => date >= addDays(new Date(), 1), "Appointment must be at least 24h ahead"),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});
