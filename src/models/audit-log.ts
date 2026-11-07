import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actorId: { type: Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, trim: true, maxlength: 120, index: true },
    entityType: { type: String, required: true, trim: true, maxlength: 80, index: true },
    entityId: { type: String, required: true, trim: true, maxlength: 120, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

export type AuditLog = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };
export const AuditLogModel =
  (models.AuditLog as Model<AuditLog>) || model<AuditLog>("AuditLog", AuditLogSchema);
