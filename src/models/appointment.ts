import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

import { APPOINTMENT_STATUSES } from "@/lib/enums";

const AppointmentSchema = new Schema(
  {
    requestId: { type: Types.ObjectId, ref: "DonationRequest", required: true, index: true },
    bankId: { type: Types.ObjectId, ref: "BloodBank", default: null, index: true },
    donorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "PENDING", index: true },
  },
  { timestamps: true },
);

AppointmentSchema.index({ donorId: 1, scheduledAt: -1 });

export type Appointment = InferSchemaType<typeof AppointmentSchema> & { _id: Types.ObjectId };
export const AppointmentModel =
  (models.Appointment as Model<Appointment>) || model<Appointment>("Appointment", AppointmentSchema);
