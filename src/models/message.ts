import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: { type: Types.ObjectId, ref: "Conversation", required: true, index: true },
    requestId: { type: Types.ObjectId, ref: "DonationRequest", required: true, index: true },
    senderId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    readBy: [{ type: Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export type Message = InferSchemaType<typeof MessageSchema> & { _id: Types.ObjectId };
export const MessageModel =
  (models.Message as Model<Message>) || model<Message>("Message", MessageSchema);
