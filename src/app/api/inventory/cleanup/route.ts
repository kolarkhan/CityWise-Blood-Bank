import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { InventoryModel } from "@/models/inventory";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN", "BLOOD_BANK_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();

  const now = new Date();
  const result = await InventoryModel.updateMany(
    {
      $or: [{ expiryDate: { $lt: now } }, { units: { $lte: 0 } }],
      isExpired: false,
    },
    {
      $set: {
        isExpired: true,
        units: 0,
      },
    },
  );

  return ok({
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
}
