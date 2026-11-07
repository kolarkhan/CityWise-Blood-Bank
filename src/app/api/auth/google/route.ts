import { randomUUID } from "node:crypto";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, setAuthCookie, signAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { UserRole } from "@/lib/enums";
import { getEnv } from "@/lib/env";
import { GOOGLE_ROLE_OPTIONS } from "@/lib/google-auth";
import { fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestClientKey } from "@/lib/request-client";
import { UserModel } from "@/models/user";

const googleLoginSchema = z.object({
  idToken: z.string().min(10),
  role: z.enum(GOOGLE_ROLE_OPTIONS).optional(),
});

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type GoogleIdTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

async function verifyGoogleIdToken(idToken: string) {
  const env = getEnv();
  const audiences = [env.GOOGLE_CLIENT_ID, env.NEXT_PUBLIC_GOOGLE_CLIENT_ID]
    .flatMap((value) => (value ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean);

  if (!audiences.length) {
    throw new Error("Google login is not configured");
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: audiences,
  });

  const typedPayload = payload as GoogleIdTokenPayload;
  if (!typedPayload.sub || !typedPayload.email) {
    throw new Error("Invalid Google token payload");
  }
  return typedPayload;
}

function generateGooglePhone(sub: string) {
  const compact = sub.replace(/[^a-zA-Z0-9]/g, "");
  const suffix = compact.slice(-14);
  return `g-${suffix || randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function getUniqueGooglePhone(sub: string) {
  const base = generateGooglePhone(sub);
  let attempt = 0;
  let candidate = base;

  while (attempt < 5) {
    const exists = await UserModel.exists({ phone: candidate });
    if (!exists) {
      return candidate;
    }
    attempt += 1;
    const rand = randomUUID().replace(/-/g, "").slice(0, 4);
    candidate = `${base.slice(0, 15)}${rand}`;
  }

  return `g-${randomUUID().replace(/-/g, "").slice(0, 14)}`;
}

export async function POST(request: NextRequest) {
  const ip = getRequestClientKey(request);
  const limiter = rateLimit(`auth:google:${ip}`, 15, 10 * 60 * 1000);
  if (!limiter.success) {
    return fail("Too many login attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = googleLoginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  let googlePayload: GoogleIdTokenPayload;
  try {
    googlePayload = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Google credentials";
    if (message === "Google login is not configured") {
      return fail(message, 500);
    }
    if (message.toLowerCase().includes("aud")) {
      return fail("Google Client ID mismatch. Check GOOGLE_CLIENT_ID values.", 401);
    }
    return fail("Invalid Google credentials", 401);
  }

  await connectToDatabase();
  const email = googlePayload.email.toLowerCase();
  let user = await UserModel.findOne({ email });

  if (user?.isBlocked) {
    return fail("User is blocked. Contact support.", 403);
  }

  if (!user) {
    const selectedRole = parsed.data.role;
    if (!selectedRole) {
      return fail("Role selection required", 409, {
        requiresRoleSelection: true,
        roleOptions: GOOGLE_ROLE_OPTIONS,
      });
    }

    const phone = await getUniqueGooglePhone(googlePayload.sub);
    user = await UserModel.create({
      role: selectedRole as UserRole,
      name: googlePayload.name?.trim() || "Google User",
      phone,
      email,
      passwordHash: await hashPassword(randomUUID()),
      city: "City not set",
      bloodGroup: null,
      cnic: null,
      address: null,
      lastDonationDate: null,
      isAvailable: false,
      emailVerified: Boolean(googlePayload.email_verified),
      phoneVerified: false,
    });
  } else if (googlePayload.email_verified && !user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }

  const token = await signAuthToken({
    userId: user._id.toString(),
    role: user.role as UserRole,
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
        id: user._id.toString(),
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
