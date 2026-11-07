import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { ConversationModel } from "@/models/conversation";
import { DonationRequestModel } from "@/models/donation-request";
import { MessageModel } from "@/models/message";
import { conversationMessageSchema } from "@/schemas/chat";

type Context = {
  params: Promise<{ id: string }>;
};

function canAccessConversation(params: {
  donorId: Types.ObjectId;
  receiverId: Types.ObjectId;
  actorId: Types.ObjectId;
}) {
  const actor = params.actorId.toString();
  return params.donorId.toString() === actor || params.receiverId.toString() === actor;
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid conversation id", 400);
  }

  await connectToDatabase();
  const conversation = await ConversationModel.findById(id).lean();
  if (!conversation) {
    return fail("Conversation not found", 404);
  }
  if (!canAccessConversation({ donorId: conversation.donorId, receiverId: conversation.receiverId, actorId: auth.user._id })) {
    return fail("Forbidden", 403);
  }

  await MessageModel.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: auth.user._id },
      readBy: { $ne: auth.user._id },
    },
    {
      $addToSet: { readBy: auth.user._id },
    },
  );

  const messages = await MessageModel.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(300)
    .populate("senderId", "name role")
    .lean();

  return ok({
    conversation: {
      id: conversation._id.toString(),
      requestId: conversation.requestId.toString(),
      donorId: conversation.donorId.toString(),
      receiverId: conversation.receiverId.toString(),
    },
    messages: messages.map((message) => ({
      id: message._id.toString(),
      body: message.body,
      createdAt: new Date(message.createdAt).toISOString(),
      sender:
        message.senderId && typeof message.senderId === "object" && "name" in message.senderId
          ? {
              id: message.senderId._id.toString(),
              name: String(message.senderId.name),
              role: String(message.senderId.role),
            }
          : {
              id: message.senderId.toString(),
              name: "Unknown User",
              role: "USER",
            },
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
    return fail("Invalid conversation id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = conversationMessageSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const conversation = await ConversationModel.findById(id).lean();
  if (!conversation) {
    return fail("Conversation not found", 404);
  }
  if (!canAccessConversation({ donorId: conversation.donorId, receiverId: conversation.receiverId, actorId: auth.user._id })) {
    return fail("Forbidden", 403);
  }

  const message = await MessageModel.create({
    conversationId: conversation._id,
    requestId: conversation.requestId,
    senderId: auth.user._id,
    body: parsed.data.message,
    readBy: [auth.user._id],
  });

  await ConversationModel.findByIdAndUpdate(conversation._id, { $set: { isActive: true } });

  const targetUserId =
    conversation.donorId.toString() === auth.user._id.toString()
      ? conversation.receiverId
      : conversation.donorId;

  const requestDoc = await DonationRequestModel.findById(conversation.requestId).select("patientName").lean();
  await createNotification({
    userId: targetUserId,
    title: "New chat message",
    message: `You have a new message for ${requestDoc?.patientName ?? "your blood request"}.`,
    type: "INFO",
  });

  return ok(
    {
      message: {
        id: message._id.toString(),
        body: message.body,
        createdAt: new Date(message.createdAt).toISOString(),
        sender: {
          id: auth.user._id.toString(),
          name: auth.user.name,
          role: auth.user.role,
        },
      },
    },
    { status: 201 },
  );
}
