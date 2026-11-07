import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const CALL_MODES = ["AUDIO", "VIDEO"] as const;
const CALL_STATUSES = ["RINGING", "ACTIVE", "DECLINED", "ENDED", "MISSED"] as const;

const CallSessionSchema = new Schema(
  {
    conversationId: { type: Types.ObjectId, ref: "Conversation", required: true, index: true },
    requestId: { type: Types.ObjectId, ref: "DonationRequest", required: true, index: true },
    callerId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    calleeId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    mode: { type: String, enum: CALL_MODES, required: true },
    status: { type: String, enum: CALL_STATUSES, required: true, default: "RINGING", index: true },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    endReason: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

CallSessionSchema.index({ conversationId: 1, status: 1, createdAt: -1 });
CallSessionSchema.index({ calleeId: 1, status: 1, createdAt: -1 });
CallSessionSchema.index({ callerId: 1, status: 1, createdAt: -1 });

export type CallSession = InferSchemaType<typeof CallSessionSchema> & { _id: Types.ObjectId };
export const CallSessionModel =
  (models.CallSession as Model<CallSession>) || model<CallSession>("CallSession", CallSessionSchema);

