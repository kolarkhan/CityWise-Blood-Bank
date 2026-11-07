import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { canAccessCall, serializeCall } from "@/lib/calls";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { getRequestClientKey } from "@/lib/request-client";
import { rateLimit } from "@/lib/rate-limit";
import { CallSessionModel } from "@/models/call-session";
import { ConversationModel } from "@/models/conversation";
import { startCallSchema } from "@/schemas/call";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const limiter = rateLimit(
    `call:start:${auth.user._id.toString()}:${getRequestClientKey(request)}`,
    20,
    60_000,
  );
  if (!limiter.success) {
    return fail("Too many call attempts. Try again shortly.", 429);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid conversation id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = startCallSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const conversation = await ConversationModel.findById(id).lean();
  if (!conversation) {
    return fail("Conversation not found", 404);
  }

  if (
    !canAccessCall({
      callerId: conversation.donorId,
      calleeId: conversation.receiverId,
      actorId: auth.user._id,
    })
  ) {
    return fail("Forbidden", 403);
  }

  const existingCall = await CallSessionModel.findOne({
    $or: [{ callerId: auth.user._id }, { calleeId: auth.user._id }],
    status: { $in: ["RINGING", "ACTIVE"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (existingCall) {
    return ok({ call: serializeCall(existingCall), reused: true });
  }

  const callerId = auth.user._id;
  const calleeId =
    conversation.donorId.toString() === callerId.toString() ? conversation.receiverId : conversation.donorId;

  const call = await CallSessionModel.create({
    conversationId: conversation._id,
    requestId: conversation.requestId,
    callerId,
    calleeId,
    mode: parsed.data.mode,
    status: "RINGING",
    startedAt: new Date(),
  });

  await createNotification({
    userId: calleeId,
    title: "Incoming call",
    message: `${auth.user.name} started a ${parsed.data.mode.toLowerCase()} call.`,
    type: "INFO",
  });

  return ok({ call: serializeCall(call), reused: false }, { status: 201 });
}
