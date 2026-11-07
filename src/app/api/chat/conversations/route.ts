import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { ConversationModel } from "@/models/conversation";
import { DonationRequestModel } from "@/models/donation-request";
import { MessageModel } from "@/models/message";
import { UserModel } from "@/models/user";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();

  const conversations = await ConversationModel.find({
    $or: [{ donorId: auth.user._id }, { receiverId: auth.user._id }],
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  if (!conversations.length) {
    return ok({ conversations: [], totalUnread: 0 });
  }

  const myId = auth.user._id.toString();
  const otherUserIds = conversations.map((conversation) =>
    conversation.donorId.toString() === myId ? conversation.receiverId.toString() : conversation.donorId.toString(),
  );
  const requestIds = conversations.map((conversation) => conversation.requestId.toString());

  const [users, requests] = await Promise.all([
    UserModel.find({ _id: { $in: otherUserIds } }).select("name role").lean(),
    DonationRequestModel.find({ _id: { $in: requestIds } }).select("patientName").lean(),
  ]);

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const requestMap = new Map(requests.map((requestDoc) => [requestDoc._id.toString(), requestDoc]));

  const conversationRows = await Promise.all(
    conversations.map(async (conversation) => {
      const lastMessage = await MessageModel.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .select("body createdAt senderId")
        .lean();

      const unread = await MessageModel.countDocuments({
        conversationId: conversation._id,
        senderId: { $ne: auth.user._id },
        readBy: { $ne: auth.user._id },
      });

      const otherUserId =
        conversation.donorId.toString() === myId
          ? conversation.receiverId.toString()
          : conversation.donorId.toString();
      const otherUser = userMap.get(otherUserId);
      const requestDoc = requestMap.get(conversation.requestId.toString());

      return {
        id: conversation._id.toString(),
        requestId: conversation.requestId.toString(),
        patientName: requestDoc?.patientName ?? "Unknown Patient",
        participant: {
          id: otherUserId,
          name: otherUser?.name ?? "Unknown User",
          role: otherUser?.role ?? "USER",
        },
        unreadCount: unread,
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: new Date(lastMessage.createdAt).toISOString(),
              senderId: lastMessage.senderId.toString(),
            }
          : null,
      };
    }),
  );

  const totalUnread = conversationRows.reduce((sum, item) => sum + item.unreadCount, 0);

  return ok({
    conversations: conversationRows,
    totalUnread,
  });
}
