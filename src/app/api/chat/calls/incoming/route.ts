import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { serializeCall } from "@/lib/calls";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { CallSessionModel } from "@/models/call-session";
import { UserModel } from "@/models/user";

type NamedCall = {
  id: string;
  conversationId: string;
  requestId: string;
  callerId: string;
  calleeId: string;
  mode: "AUDIO" | "VIDEO";
  status: "RINGING" | "ACTIVE" | "DECLINED" | "ENDED" | "MISSED";
  createdAt: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  callerName: string;
  calleeName: string;
};

function withNames(
  call: ReturnType<typeof serializeCall> | null,
  userNames: Map<string, string>,
): NamedCall | null {
  if (!call) return null;
  return {
    ...call,
    mode: call.mode as NamedCall["mode"],
    status: call.status as NamedCall["status"],
    callerName: userNames.get(call.callerId) ?? "Unknown User",
    calleeName: userNames.get(call.calleeId) ?? "Unknown User",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();

  const timeoutAt = new Date(Date.now() - 90_000);
  await CallSessionModel.updateMany(
    { status: "RINGING", createdAt: { $lt: timeoutAt } },
    { $set: { status: "MISSED", endedAt: new Date(), endReason: "NO_ANSWER" } },
  );

  const [incomingCall, activeCall] = await Promise.all([
    CallSessionModel.findOne({
      calleeId: auth.user._id,
      status: "RINGING",
    })
      .sort({ createdAt: -1 })
      .lean(),
    CallSessionModel.findOne({
      $or: [{ callerId: auth.user._id }, { calleeId: auth.user._id }],
      status: "ACTIVE",
    })
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const userIds = new Set<string>();
  for (const call of [incomingCall, activeCall]) {
    if (!call) continue;
    userIds.add(call.callerId.toString());
    userIds.add(call.calleeId.toString());
  }

  const users = userIds.size
    ? await UserModel.find({ _id: { $in: Array.from(userIds) } }).select("name").lean()
    : [];
  const userNames = new Map(users.map((user) => [user._id.toString(), user.name]));

  return ok({
    incomingCall: withNames(incomingCall ? serializeCall(incomingCall) : null, userNames),
    activeCall: withNames(activeCall ? serializeCall(activeCall) : null, userNames),
  });
}
