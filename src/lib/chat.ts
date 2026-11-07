import { Types } from "mongoose";

import { ConversationModel } from "@/models/conversation";

export async function getOrCreateConversation(params: {
  requestId: Types.ObjectId | string;
  donorId: Types.ObjectId | string;
  receiverId: Types.ObjectId | string;
}) {
  const conversation = await ConversationModel.findOneAndUpdate(
    {
      requestId: params.requestId,
      donorId: params.donorId,
    },
    {
      $setOnInsert: {
        receiverId: params.receiverId,
        isActive: true,
      },
    },
    { new: true, upsert: true },
  );

  return conversation;
}

export function toObjectId(value: string | Types.ObjectId) {
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
}
