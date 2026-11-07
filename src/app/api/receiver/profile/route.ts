import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { UserModel } from "@/models/user";
import { receiverProfileUpdateSchema } from "@/schemas/receiver";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["RECEIVER"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const user = await UserModel.findById(auth.user._id)
    .select("name city phone email profileImage")
    .lean();
  if (!user) {
    return fail("Receiver profile not found", 404);
  }

  return ok({
    profile: {
      name: user.name,
      city: user.city,
      phone: user.phone,
      email: user.email,
      profileImage: user.profileImage ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["RECEIVER"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = receiverProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const user = await UserModel.findByIdAndUpdate(
    auth.user._id,
    { $set: { profileImage: parsed.data.profileImage ?? null } },
    { new: true },
  )
    .select("name city phone email profileImage")
    .lean();

  if (!user) {
    return fail("Receiver profile not found", 404);
  }

  return ok({
    profile: {
      name: user.name,
      city: user.city,
      phone: user.phone,
      email: user.email,
      profileImage: user.profileImage ?? null,
    },
  });
}
