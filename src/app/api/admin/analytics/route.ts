import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { DonationRequestModel } from "@/models/donation-request";
import { InventoryModel } from "@/models/inventory";
import { UserModel } from "@/models/user";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const cityFilter = auth.user.role === "CITY_ADMIN" ? { city: auth.user.city } : {};

  const [cityWiseDonors, bloodGroupAvailability, emergencyStats, lowStockSummary] = await Promise.all([
    UserModel.aggregate([
      { $match: { role: "DONOR", isBlocked: false, ...cityFilter } },
      { $group: { _id: "$city", donors: { $sum: 1 }, available: { $sum: { $cond: ["$isAvailable", 1, 0] } } } },
      { $sort: { donors: -1 } },
    ]),
    InventoryModel.aggregate([
      { $match: { isExpired: false, ...cityFilter } },
      { $group: { _id: "$bloodGroup", units: { $sum: "$units" } } },
      { $sort: { units: -1 } },
    ]),
    DonationRequestModel.aggregate([
      { $match: { urgency: "EMERGENCY", ...cityFilter } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [{ $in: ["$status", ["ACCEPTED", "SCHEDULED", "COMPLETED"]] }, 1, 0],
            },
          },
        },
      },
    ]),
    InventoryModel.aggregate([
      {
        $match: {
          ...cityFilter,
          isExpired: false,
          units: { $lte: LOW_STOCK_THRESHOLD },
        },
      },
      {
        $group: {
          _id: "$city",
          lowStockItems: { $sum: 1 },
        },
      },
      { $sort: { lowStockItems: -1 } },
    ]),
  ]);

  const emergency = emergencyStats[0] ?? { total: 0, successful: 0 };
  const successRate = emergency.total ? Number(((emergency.successful / emergency.total) * 100).toFixed(2)) : 0;

  return ok({
    cityWiseDonors,
    bloodGroupAvailability,
    emergencyRequests: {
      total: emergency.total,
      successful: emergency.successful,
      successRate,
    },
    lowStockSummary,
  });
}
