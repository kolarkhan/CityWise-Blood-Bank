import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { NotificationModel } from "@/models/notification";
import { notificationReadSchema } from "@/schemas/notification";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid notification id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = notificationReadSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const updated = await NotificationModel.findOneAndUpdate(
    { _id: id, userId: auth.user._id },
    { $set: { read: parsed.data.read } },
    { new: true },
  );

  if (!updated) {
    return fail("Notification not found", 404);
  }

  return ok({ notification: updated });
}
