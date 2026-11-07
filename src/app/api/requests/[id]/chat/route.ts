import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { getOrCreateConversation } from "@/lib/chat";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { MessageModel } from "@/models/message";
import { DonationRequestModel } from "@/models/donation-request";
import { chatMessageSchema } from "@/schemas/chat";

type Context = {
  params: Promise<{ id: string }>;
};

function normalizeId(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const maybeId = (value as { _id?: unknown })._id;
    if (maybeId instanceof Types.ObjectId) return maybeId.toString();
    if (typeof maybeId === "string") return maybeId;
  }
  return null;
}

function includesId(list: unknown[] | undefined, id: string) {
  return (list ?? []).some((item) => normalizeId(item) === id);
}

async function resolveParticipants(params: {
  requestId: string;
  actorId: string;
  actorRole: string;
  donorIdInput?: string | null;
}) {
  const requestDoc = await DonationRequestModel.findById(params.requestId).select(
    "createdBy acceptedBy emergencyAcceptedBy contactRevealedTo patientName",
  );
  if (!requestDoc) {
    return { error: "Request not found" as const };
  }

  const createdById = normalizeId(requestDoc.createdBy);
  const acceptedById = normalizeId(requestDoc.acceptedBy);
  const emergencyDonorIds = (requestDoc.emergencyAcceptedBy ?? [])
    .map((item) => normalizeId(item))
    .filter((value): value is string => Boolean(value));
  const contactRevealed = (requestDoc.contactRevealedTo ?? [])
    .map((item) => normalizeId(item))
    .filter((value): value is string => Boolean(value));

  if (!createdById) {
    return { error: "Request owner missing" as const };
  }

  if (params.actorRole === "DONOR") {
    if (!includesId(requestDoc.contactRevealedTo, params.actorId)) {
      return { error: "Chat is not available for this request" as const };
    }

    return {
      requestDoc,
      donorId: params.actorId,
      receiverId: createdById,
    };
  }

  if (!["RECEIVER", "HOSPITAL", "SUPER_ADMIN", "CITY_ADMIN"].includes(params.actorRole)) {
    return { error: "Forbidden" as const };
  }

  if (createdById !== params.actorId && !["SUPER_ADMIN", "CITY_ADMIN"].includes(params.actorRole)) {
    return { error: "Forbidden" as const };
  }

  const preferredDonorId = params.donorIdInput ?? acceptedById ?? emergencyDonorIds[0] ?? null;
  if (!preferredDonorId) {
    return { error: "No accepted donor found for this request yet" as const };
  }

  const isAllowedDonor =
    preferredDonorId === acceptedById ||
    emergencyDonorIds.includes(preferredDonorId) ||
    contactRevealed.includes(preferredDonorId);

  if (!isAllowedDonor) {
    return { error: "Selected donor is not part of this request" as const };
  }

  return {
    requestDoc,
    donorId: preferredDonorId,
    receiverId: createdById,
  };
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid request id", 400);
  }

  await connectToDatabase();

  const donorIdInput = request.nextUrl.searchParams.get("donorId");
  const participants = await resolveParticipants({
    requestId: id,
    actorId: auth.user._id.toString(),
    actorRole: auth.user.role,
    donorIdInput,
  });
  if ("error" in participants) {
    return fail(participants.error, participants.error === "Request not found" ? 404 : 403);
  }

  const conversation = await getOrCreateConversation({
    requestId: id,
    donorId: participants.donorId,
    receiverId: participants.receiverId,
  });

  const messages = await MessageModel.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate("senderId", "name role")
    .lean();

  return ok({
    conversation: {
      id: conversation._id.toString(),
      requestId: id,
      donorId: participants.donorId,
      receiverId: participants.receiverId,
      patientName: participants.requestDoc.patientName,
    },
    messages: messages.map((message) => ({
      id: message._id.toString(),
      senderId: normalizeId(message.senderId),
      senderName:
        message.senderId && typeof message.senderId === "object" && "name" in message.senderId
          ? String(message.senderId.name)
          : "Unknown",
      senderRole:
        message.senderId && typeof message.senderId === "object" && "role" in message.senderId
          ? String(message.senderId.role)
          : "USER",
      body: message.body,
      createdAt: new Date(message.createdAt).toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid request id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();

  const participants = await resolveParticipants({
    requestId: id,
    actorId: auth.user._id.toString(),
    actorRole: auth.user.role,
    donorIdInput: parsed.data.donorId ?? null,
  });
  if ("error" in participants) {
    return fail(participants.error, participants.error === "Request not found" ? 404 : 403);
  }

  const conversation = await getOrCreateConversation({
    requestId: id,
    donorId: participants.donorId,
    receiverId: participants.receiverId,
  });

  const senderId = auth.user._id.toString();
  const receiverId = senderId === participants.donorId ? participants.receiverId : participants.donorId;

  const message = await MessageModel.create({
    conversationId: conversation._id,
    requestId: id,
    senderId,
    body: parsed.data.message,
    readBy: [senderId],
  });

  await createNotification({
    userId: receiverId,
    title: "New message on blood request",
    message: `You have a new message regarding patient ${participants.requestDoc.patientName}.`,
    type: "INFO",
  });

  return ok(
    {
      message: {
        id: message._id.toString(),
        senderId,
        body: message.body,
        createdAt: new Date(message.createdAt).toISOString(),
      },
    },
    { status: 201 },
  );
}
