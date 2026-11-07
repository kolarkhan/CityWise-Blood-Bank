import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { BloodBankModel } from "@/models/blood-bank";
import { InventoryModel } from "@/models/inventory";
import { inventoryUpdateSchema } from "@/schemas/inventory";

type Context = {
  params: Promise<{ id: string }>;
};

async function canManageInventoryItem(inventoryId: string, userId: Types.ObjectId, role: string) {
  if (role !== "BLOOD_BANK_ADMIN") {
    return true;
  }

  const bank = await BloodBankModel.findOne({ adminUserId: userId }).select("_id");
  if (!bank) {
    return false;
  }
  const exists = await InventoryModel.exists({ _id: inventoryId, bankId: bank._id });
  return Boolean(exists);
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid inventory id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = inventoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const allowed = await canManageInventoryItem(id, auth.user._id, auth.user.role);
  if (!allowed) {
    return fail("Forbidden", 403);
  }

  const patch = parsed.data;
  const isExpired =
    (patch.expiryDate ? patch.expiryDate < new Date() : false) ||
    (typeof patch.units === "number" && patch.units <= 0);

  const updated = await InventoryModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...patch,
        ...(patch.units !== undefined || patch.expiryDate !== undefined ? { isExpired } : {}),
      },
    },
    { new: true },
  );

  if (!updated) {
    return fail("Inventory item not found", 404);
  }

  return ok({ inventory: updated });
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid inventory id", 400);
  }

  await connectToDatabase();
  const allowed = await canManageInventoryItem(id, auth.user._id, auth.user.role);
  if (!allowed) {
    return fail("Forbidden", 403);
  }

  const removed = await InventoryModel.findByIdAndDelete(id);
  if (!removed) {
    return fail("Inventory item not found", 404);
  }

  return ok({ deleted: true });
}
