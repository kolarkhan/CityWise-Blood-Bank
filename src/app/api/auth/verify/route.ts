import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { UserModel } from "@/models/user";
import { verifyContactSchema } from "@/schemas/verification";

const DEMO_OTP_CODE = "123456";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = verifyContactSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  if (parsed.data.code !== DEMO_OTP_CODE) {
    return fail("Invalid verification code", 401);
  }

  await connectToDatabase();
  const update =
    parsed.data.type === "email" ? { emailVerified: true } : { phoneVerified: true };

  const user = await UserModel.findByIdAndUpdate(auth.user._id, { $set: update }, { new: true })
    .select("-passwordHash")
    .lean();

  return ok({ user, verified: parsed.data.type });
}
