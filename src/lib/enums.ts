export const USER_ROLES = [
  "SUPER_ADMIN",
  "CITY_ADMIN",
  "BLOOD_BANK_ADMIN",
  "DONOR",
  "RECEIVER",
  "HOSPITAL",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const REQUEST_URGENCY = ["NORMAL", "EMERGENCY"] as const;
export type RequestUrgency = (typeof REQUEST_URGENCY)[number];

export const REQUEST_STATUSES = [
  "OPEN",
  "MATCHING",
  "ACCEPTED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "DONE"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
