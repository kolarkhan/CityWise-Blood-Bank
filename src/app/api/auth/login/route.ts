import { NextRequest, NextResponse } from "next/server";

import { setAuthCookie, signAuthToken, verifyPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestClientKey } from "@/lib/request-client";
import { UserModel } from "@/models/user";
import { loginSchema } from "@/schemas/auth";

export async function POST(request: NextRequest) {
  const ip = getRequestClientKey(request);
  const limiter = rateLimit(`auth:login:${ip}`, 10, 10 * 60 * 1000);
  if (!limiter.success) {
    return fail("Too many login attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user) {
    return fail("Invalid credentials", 401);
  }

  if (user.isBlocked) {
    return fail("User is blocked. Contact support.", 403);
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return fail("Invalid credentials", 401);
  }

  const token = await signAuthToken({
    userId: user._id.toString(),
    role: user.role,
    city: user.city,
    email: user.email,
    name: user.name,
  });
  const onboardingPath =
    user.role === "DONOR" && !isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup })
      ? DONOR_ONBOARDING_PATH
      : null;

  const response = NextResponse.json({
    success: true,
    data: {
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        city: user.city,
      },
      onboardingPath,
    },
  });
  setAuthCookie(response, token);
  return response;
}
