import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

import { BLOOD_GROUPS } from "@/lib/enums";

const InventorySchema = new Schema(
  {
    bankId: { type: Types.ObjectId, ref: "BloodBank", required: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    units: { type: Number, required: true, min: 0, default: 0 },
    expiryDate: { type: Date, required: true, index: true },
    batchId: { type: String, default: null, trim: true },
    isExpired: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

InventorySchema.index({ city: 1, bloodGroup: 1 });
InventorySchema.index({ bankId: 1, bloodGroup: 1, expiryDate: 1 });

InventorySchema.pre("save", function checkExpiry(next) {
  this.isExpired = this.expiryDate < new Date() || this.units <= 0;
  if (this.isExpired) {
    this.units = 0;
  }
  next();
});

export type Inventory = InferSchemaType<typeof InventorySchema> & { _id: Types.ObjectId };
export const InventoryModel =
  (models.Inventory as Model<Inventory>) || model<Inventory>("Inventory", InventorySchema);
