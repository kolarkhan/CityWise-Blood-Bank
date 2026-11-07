import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

import { BLOOD_GROUPS, REQUEST_STATUSES, REQUEST_URGENCY } from "@/lib/enums";

const DonationRequestSchema = new Schema(
  {
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },
    patientName: { type: String, required: true, trim: true, maxlength: 120 },
    hospitalName: { type: String, default: null, trim: true, maxlength: 120 },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    units: { type: Number, required: true, min: 1 },
    city: { type: String, required: true, trim: true, index: true },
    urgency: { type: String, enum: REQUEST_URGENCY, required: true, index: true },
    contactPhone: { type: String, required: true, trim: true },
    neededByDate: { type: Date, required: true },
    status: { type: String, enum: REQUEST_STATUSES, default: "OPEN", index: true },
    acceptedBy: { type: Types.ObjectId, ref: "User", default: null, index: true },
    acceptedAt: { type: Date, default: null },
    emergencyAcceptedBy: [{ type: Types.ObjectId, ref: "User" }],
    maxEmergencyAcceptances: { type: Number, default: 3, min: 1, max: 10 },
    notifiedDonors: [{ type: Types.ObjectId, ref: "User" }],
    contactRevealedTo: [{ type: Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

DonationRequestSchema.index({ city: 1, bloodGroup: 1, urgency: 1, status: 1 });
DonationRequestSchema.index({ createdBy: 1, createdAt: -1 });

export type DonationRequest = InferSchemaType<typeof DonationRequestSchema> & { _id: Types.ObjectId };
export const DonationRequestModel =
  (models.DonationRequest as Model<DonationRequest>) ||
  model<DonationRequest>("DonationRequest", DonationRequestSchema);
