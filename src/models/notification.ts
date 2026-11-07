import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

import { NOTIFICATION_TYPES } from "@/lib/enums";

const NotificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "INFO", index: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof NotificationSchema> & { _id: Types.ObjectId };
export const NotificationModel =
  (models.Notification as Model<Notification>) ||
  model<Notification>("Notification", NotificationSchema);
