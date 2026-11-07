import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { canAccessCall } from "@/lib/calls";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { getRequestClientKey } from "@/lib/request-client";
import { rateLimit } from "@/lib/rate-limit";
import { CallSessionModel } from "@/models/call-session";
import { CallSignalModel } from "@/models/call-signal";
import { callSignalSchema } from "@/schemas/call";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid call id", 400);
  }

  const after = request.nextUrl.searchParams.get("after");
  if (after && !Types.ObjectId.isValid(after)) {
    return fail("Invalid signal cursor", 400);
  }

  await connectToDatabase();

  const call = await CallSessionModel.findById(id).lean();
  if (!call) {
    return fail("Call not found", 404);
  }
  if (!canAccessCall({ callerId: call.callerId, calleeId: call.calleeId, actorId: auth.user._id })) {
    return fail("Forbidden", 403);
  }

  const query: Record<string, unknown> = {
    callId: call._id,
    fromUserId: { $ne: auth.user._id },
  };
  if (after) {
    query._id = { $gt: new Types.ObjectId(after) };
  }

  const signals = await CallSignalModel.find(query).sort({ _id: 1 }).limit(100).lean();

  return ok({
    signals: signals.map((signal) => ({
      id: signal._id.toString(),
      type: signal.type,
      payload: signal.payload,
      fromUserId: signal.fromUserId.toString(),
      createdAt: new Date(signal.createdAt).toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const limiter = rateLimit(
    `call:signal:${auth.user._id.toString()}:${getRequestClientKey(request)}`,
    200,
    60_000,
  );
  if (!limiter.success) {
    return fail("Too many signaling events. Try again.", 429);
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

  const parsed = callSignalSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const call = await CallSessionModel.findById(id).lean();
  if (!call) {
    return fail("Call not found", 404);
  }
  if (!canAccessCall({ callerId: call.callerId, calleeId: call.calleeId, actorId: auth.user._id })) {
    return fail("Forbidden", 403);
  }
  if (!["RINGING", "ACTIVE"].includes(call.status)) {
    return fail("Call is no longer active", 409);
  }

  const signal = await CallSignalModel.create({
    callId: call._id,
    conversationId: call.conversationId,
    fromUserId: auth.user._id,
    type: parsed.data.type,
    payload: parsed.data.payload,
  });

  return ok(
    {
      signal: {
        id: signal._id.toString(),
        type: signal.type,
      },
    },
    { status: 201 },
  );
}

