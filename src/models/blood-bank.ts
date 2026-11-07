import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const BloodBankSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, index: true },
    licenseNo: { type: String, required: true, trim: true, unique: true, index: true },
    contactPhone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true, maxlength: 400 },
    operatingHours: { type: String, default: "24/7", trim: true },
    profileImage: { type: String, default: null, trim: true, maxlength: 3_000_000 },
    coverImage: { type: String, default: null, trim: true, maxlength: 4_500_000 },
    geo: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    adminUserId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verifiedBy: { type: Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 400 },
  },
  { timestamps: true },
);

BloodBankSchema.index({ city: 1, isVerified: 1 });

export type BloodBank = InferSchemaType<typeof BloodBankSchema> & { _id: Types.ObjectId };
export const BloodBankModel =
  (models.BloodBank as Model<BloodBank>) || model<BloodBank>("BloodBank", BloodBankSchema);
