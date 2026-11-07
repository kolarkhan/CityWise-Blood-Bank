import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const SIGNAL_TYPES = ["OFFER", "ANSWER", "ICE_CANDIDATE"] as const;

const CallSignalSchema = new Schema(
  {
    callId: { type: Types.ObjectId, ref: "CallSession", required: true, index: true },
    conversationId: { type: Types.ObjectId, ref: "Conversation", required: true, index: true },
    fromUserId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: SIGNAL_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

CallSignalSchema.index({ callId: 1, _id: 1 });

export type CallSignal = InferSchemaType<typeof CallSignalSchema> & { _id: Types.ObjectId };
export const CallSignalModel =
  (models.CallSignal as Model<CallSignal>) || model<CallSignal>("CallSignal", CallSignalSchema);

