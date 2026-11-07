import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

import { BLOOD_GROUPS, USER_ROLES } from "@/lib/enums";

const UserSchema = new Schema(
  {
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    city: { type: String, required: true, trim: true, index: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, default: null, index: true },
    cnic: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true, maxlength: 300 },
    profileImage: { type: String, default: null, trim: true, maxlength: 3_000_000 },
    coverImage: { type: String, default: null, trim: true, maxlength: 4_500_000 },
    geo: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    lastDonationDate: { type: Date, default: null },
    isAvailable: { type: Boolean, default: true, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    managedBankId: { type: Types.ObjectId, ref: "BloodBank", default: null },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ city: 1, bloodGroup: 1, isAvailable: 1 });

export type User = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const UserModel = (models.User as Model<User>) || model<User>("User", UserSchema);
