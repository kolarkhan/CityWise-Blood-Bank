import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import { NotificationModel } from "@/models/notification";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const readFilter = request.nextUrl.searchParams.get("read");

  const filters: Record<string, unknown> = {
    userId: auth.user._id,
  };
  if (readFilter === "true") {
    filters.read = true;
  } else if (readFilter === "false") {
    filters.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    NotificationModel.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationModel.countDocuments(filters),
    NotificationModel.countDocuments({
      userId: auth.user._id,
      read: false,
    }),
  ]);

  return ok({
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();

  const result = await NotificationModel.updateMany(
    { userId: auth.user._id, read: false },
    { $set: { read: true } },
  );

  return ok({ updated: result.modifiedCount });
}
