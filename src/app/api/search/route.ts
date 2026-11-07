import { subDays } from "date-fns";
import { NextRequest } from "next/server";

import { DONATION_COOLDOWN_DAYS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { InventoryModel } from "@/models/inventory";
import { UserModel } from "@/models/user";
import { searchSchema } from "@/schemas/search";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = searchSchema.safeParse({
    city: params.get("city"),
    bloodGroup: params.get("bloodGroup"),
    page: params.get("page") ?? 1,
    limit: params.get("limit") ?? 10,
  });

  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  const { city, bloodGroup, page, limit } = parsed.data;
  const skip = (page - 1) * limit;
  const eligibleBefore = subDays(new Date(), DONATION_COOLDOWN_DAYS);

  await connectToDatabase();

  const [donors, donorCount, banks] = await Promise.all([
    UserModel.find({
      role: "DONOR",
      isBlocked: false,
      isAvailable: true,
      city,
      bloodGroup,
      $or: [{ lastDonationDate: null }, { lastDonationDate: { $lte: eligibleBefore } }],
    })
      .select("name city bloodGroup createdAt geo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments({
      role: "DONOR",
      isBlocked: false,
      isAvailable: true,
      city,
      bloodGroup,
      $or: [{ lastDonationDate: null }, { lastDonationDate: { $lte: eligibleBefore } }],
    }),
    InventoryModel.aggregate([
      {
        $match: {
          city,
          bloodGroup,
          units: { $gt: 0 },
          isExpired: false,
          expiryDate: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: "$bankId",
          availableUnits: { $sum: "$units" },
          nextExpiry: { $min: "$expiryDate" },
        },
      },
      {
        $lookup: {
          from: "bloodbanks",
          localField: "_id",
          foreignField: "_id",
          as: "bank",
        },
      },
      { $unwind: "$bank" },
      {
        $match: {
          "bank.isVerified": true,
        },
      },
      {
        $project: {
          _id: 0,
          bankId: "$bank._id",
          name: "$bank.name",
          city: "$bank.city",
          address: "$bank.address",
          contactPhone: "$bank.contactPhone",
          geo: "$bank.geo",
          availableUnits: 1,
          nextExpiry: 1,
        },
      },
      { $sort: { availableUnits: -1 } },
      { $limit: 30 },
    ]),
  ]);

  return ok({
    filters: { city, bloodGroup, page, limit },
    donors: donors.map((donor) => ({
      id: donor._id,
      displayName: `${donor.name.split(" ")[0]} ${donor.name.split(" ").slice(1).map((p) => p[0]).join("")}`.trim(),
      city: donor.city,
      bloodGroup: donor.bloodGroup,
      geo: donor.geo
        ? {
            lat: typeof donor.geo.lat === "number" ? donor.geo.lat : null,
            lng: typeof donor.geo.lng === "number" ? donor.geo.lng : null,
          }
        : null,
    })),
    banks,
    pagination: {
      page,
      limit,
      total: donorCount,
      pages: Math.ceil(donorCount / limit),
    },
  });
}
