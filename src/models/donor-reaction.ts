import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const DonorReactionSchema = new Schema(
  {
    donorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    reaction: { type: Number, enum: [1, -1], required: true, index: true },
  },
  { timestamps: true },
);

DonorReactionSchema.index({ donorId: 1, userId: 1 }, { unique: true });
DonorReactionSchema.index({ donorId: 1, reaction: 1 });

export type DonorReaction = InferSchemaType<typeof DonorReactionSchema> & { _id: Types.ObjectId };
export const DonorReactionModel =
  (models.DonorReaction as Model<DonorReaction>) ||
  model<DonorReaction>("DonorReaction", DonorReactionSchema);

