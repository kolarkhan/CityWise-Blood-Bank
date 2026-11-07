import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const ConversationSchema = new Schema(
  {
    requestId: { type: Types.ObjectId, ref: "DonationRequest", required: true, index: true },
    donorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ConversationSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

export type Conversation = InferSchemaType<typeof ConversationSchema> & { _id: Types.ObjectId };
export const ConversationModel =
  (models.Conversation as Model<Conversation>) ||
  model<Conversation>("Conversation", ConversationSchema);
