export const GOOGLE_PENDING_SIGNIN_KEY = "citywise_google_pending_signin";

export const GOOGLE_ROLE_OPTIONS = ["DONOR", "RECEIVER", "HOSPITAL", "BLOOD_BANK_ADMIN"] as const;
export type GoogleRole = (typeof GOOGLE_ROLE_OPTIONS)[number];

export type PendingGoogleSignin = {
  idToken: string;
  roleOptions: GoogleRole[];
  next: string | null;
  createdAt: number;
};

function isGoogleRole(value: string): value is GoogleRole {
  return (GOOGLE_ROLE_OPTIONS as readonly string[]).includes(value);
}

export function parseGoogleRoleOptions(input: unknown): GoogleRole[] {
  if (!Array.isArray(input)) {
    return [...GOOGLE_ROLE_OPTIONS];
  }
  const options = input.filter((item): item is string => typeof item === "string").filter(isGoogleRole);
  return options.length ? options : [...GOOGLE_ROLE_OPTIONS];
}
