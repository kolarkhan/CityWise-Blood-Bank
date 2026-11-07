import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { canAccessCall, serializeCall } from "@/lib/calls";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { CallSessionModel } from "@/models/call-session";
import { UserModel } from "@/models/user";
import { callActionSchema } from "@/schemas/call";

type Context = {
  params: Promise<{ id: string }>;
};

async function getNamedCall(id: string, actorId: Types.ObjectId) {
  const call = await CallSessionModel.findById(id).lean();
  if (!call) return null;

  if (!canAccessCall({ callerId: call.callerId, calleeId: call.calleeId, actorId })) {
    return { error: "Forbidden" as const };
  }

  const users = await UserModel.find({ _id: { $in: [call.callerId, call.calleeId] } }).select("name").lean();
  const userNames = new Map(users.map((user) => [user._id.toString(), user.name]));

  return {
    call: {
      ...serializeCall(call),
      callerName: userNames.get(call.callerId.toString()) ?? "Unknown User",
      calleeName: userNames.get(call.calleeId.toString()) ?? "Unknown User",
    },
  };
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid call id", 400);
  }

  await connectToDatabase();
  const result = await getNamedCall(id, auth.user._id);
  if (!result) return fail("Call not found", 404);
  if ("error" in result) return fail(result.error, 403);

  return ok(result);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid call id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = callActionSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const existing = await CallSessionModel.findById(id).lean();
  if (!existing) {
    return fail("Call not found", 404);
  }
  if (!canAccessCall({ callerId: existing.callerId, calleeId: existing.calleeId, actorId: auth.user._id })) {
    return fail("Forbidden", 403);
  }

  let updatedCall = null;
  const now = new Date();

  if (parsed.data.action === "ACCEPT") {
    if (existing.calleeId.toString() !== auth.user._id.toString()) {
      return fail("Only the receiver can accept this call", 403);
    }
    updatedCall = await CallSessionModel.findOneAndUpdate(
      {
        _id: existing._id,
        status: "RINGING",
      },
      {
        $set: { status: "ACTIVE", answeredAt: now },
      },
      { new: true },
    );
    if (!updatedCall) {
      return fail("Call is no longer available to accept", 409);
    }
    await createNotification({
      userId: existing.callerId,
      title: "Call accepted",
      message: `${auth.user.name} accepted your call.`,
      type: "SUCCESS",
    });
  }

  if (parsed.data.action === "DECLINE") {
    updatedCall = await CallSessionModel.findOneAndUpdate(
      {
        _id: existing._id,
        status: { $in: ["RINGING", "ACTIVE"] },
      },
      {
        $set: {
          status: "DECLINED",
          endedAt: now,
          endReason: "DECLINED_BY_USER",
        },
      },
      { new: true },
    );
    if (!updatedCall) {
      return fail("Call is no longer active", 409);
    }
    const targetUserId =
      existing.callerId.toString() === auth.user._id.toString() ? existing.calleeId : existing.callerId;
    await createNotification({
      userId: targetUserId,
      title: "Call declined",
      message: `${auth.user.name} declined the call.`,
      type: "WARNING",
    });
  }

  if (parsed.data.action === "END") {
    updatedCall = await CallSessionModel.findOneAndUpdate(
      {
        _id: existing._id,
        status: { $in: ["RINGING", "ACTIVE"] },
      },
      {
        $set: {
          status: "ENDED",
          endedAt: now,
          endReason: "ENDED_BY_USER",
        },
      },
      { new: true },
    );
    if (!updatedCall) {
      return fail("Call is already ended", 409);
    }

    const targetUserId =
      existing.callerId.toString() === auth.user._id.toString() ? existing.calleeId : existing.callerId;
    await createNotification({
      userId: targetUserId,
      title: "Call ended",
      message: `${auth.user.name} ended the call.`,
      type: "INFO",
    });
  }

  if (!updatedCall) {
    return fail("Unable to process call action", 400);
  }

  const result = await getNamedCall(updatedCall._id.toString(), auth.user._id);
  if (!result || "error" in result) {
    return fail("Unable to load updated call", 500);
  }

  return ok(result);
}

