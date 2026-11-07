import { NextRequest, NextResponse } from "next/server";

import { hashPassword, setAuthCookie, signAuthToken } from "@/lib/auth";
import { getDonorEligibility } from "@/lib/donor";
import { USER_ROLES } from "@/lib/enums";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestClientKey } from "@/lib/request-client";
import { UserModel } from "@/models/user";
import { registerSchema } from "@/schemas/auth";
import { connectToDatabase } from "@/lib/db";

const ALLOWED_SELF_REGISTER_ROLES = ["DONOR", "RECEIVER", "HOSPITAL", "BLOOD_BANK_ADMIN"] as const;

export async function POST(request: NextRequest) {
  const ip = getRequestClientKey(request);
  const limiter = rateLimit(`auth:register:${ip}`, 8, 10 * 60 * 1000);
  if (!limiter.success) {
    return fail("Too many registration attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  const payload = parsed.data;
  if (!ALLOWED_SELF_REGISTER_ROLES.includes(payload.role)) {
    return fail("Selected role cannot be self-registered", 403);
  }

  if (payload.role === "DONOR" && !payload.bloodGroup) {
    return fail("bloodGroup is required for donors", 422);
  }

  await connectToDatabase();

  const existing = await UserModel.findOne({
    $or: [{ email: payload.email.toLowerCase() }, { phone: payload.phone }],
  }).select("_id");

  if (existing) {
    return fail("Email or phone already exists", 409);
  }

  const { isEligible, nextEligibleDate } = getDonorEligibility(payload.lastDonationDate);
  const createdUser = await UserModel.create({
    role: payload.role,
    name: payload.name,
    phone: payload.phone,
    email: payload.email.toLowerCase(),
    passwordHash: await hashPassword(payload.password),
    city: payload.city,
    bloodGroup: payload.bloodGroup ?? null,
    cnic: payload.cnic ?? null,
    address: payload.address ?? null,
    lastDonationDate: payload.lastDonationDate ?? null,
    isAvailable: payload.role === "DONOR" ? isEligible : false,
    emailVerified: false,
    phoneVerified: false,
  });

  const token = await signAuthToken({
    userId: createdUser._id.toString(),
    role: createdUser.role as (typeof USER_ROLES)[number],
    city: createdUser.city,
    email: createdUser.email,
    name: createdUser.name,
  });

  const response = NextResponse.json({
    success: true,
    data: {
      user: {
        id: createdUser._id,
        role: createdUser.role,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        city: createdUser.city,
        bloodGroup: createdUser.bloodGroup,
        nextEligibleDate,
      },
    },
  });
  setAuthCookie(response, token);
  return response;
}

export async function GET() {
  return ok({
    message: "Use POST /api/auth/register",
  });
}
