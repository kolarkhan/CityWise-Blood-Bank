import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { canAccessRole, requireAuth } from "@/lib/authorization";
import { logAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { UserModel } from "@/models/user";
import { blockUserSchema } from "@/schemas/admin";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid user id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = blockUserSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const target = await UserModel.findById(id).select("role city");
  if (!target) {
    return fail("User not found", 404);
  }

  if (auth.user.role === "CITY_ADMIN" && target.city !== auth.user.city) {
    return fail("City admin can only manage users in their city", 403);
  }

  if (!canAccessRole(target.role, auth.user.role)) {
    return fail("Insufficient permission to update this user", 403);
  }

  const updated = await UserModel.findByIdAndUpdate(
    id,
    { $set: { isBlocked: parsed.data.isBlocked } },
    { new: true },
  )
    .select("-passwordHash")
    .lean();

  if (!updated) {
    return fail("User not found", 404);
  }

  await Promise.all([
    createNotification({
      userId: updated._id,
      title: parsed.data.isBlocked ? "Account blocked" : "Account unblocked",
      message: parsed.data.isBlocked
        ? "Your account has been blocked by an administrator."
        : "Your account access has been restored.",
      type: parsed.data.isBlocked ? "ERROR" : "SUCCESS",
    }),
    logAudit({
      actorId: auth.user._id,
      action: parsed.data.isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
      entityType: "User",
      entityId: updated._id,
      meta: { role: updated.role },
    }),
  ]);

  return ok({ user: updated });
}
