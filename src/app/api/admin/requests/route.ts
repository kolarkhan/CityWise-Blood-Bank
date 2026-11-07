import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import { DonationRequestModel } from "@/models/donation-request";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status");
  const urgency = request.nextUrl.searchParams.get("urgency");

  const filters: Record<string, unknown> = {};
  if (status) {
    filters.status = status;
  }
  if (urgency) {
    filters.urgency = urgency;
  }
  if (auth.user.role === "CITY_ADMIN") {
    filters.city = auth.user.city;
  }

  const [requests, total] = await Promise.all([
    DonationRequestModel.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name role")
      .populate("acceptedBy", "name role")
      .lean(),
    DonationRequestModel.countDocuments(filters),
  ]);

  return ok({
    requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
