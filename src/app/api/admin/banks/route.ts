import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { BloodBankModel } from "@/models/blood-bank";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const params = request.nextUrl.searchParams;
  const city = params.get("city");
  const status = params.get("status");

  await connectToDatabase();

  const filters: Record<string, unknown> = {};
  if (city) {
    filters.city = city;
  }
  if (status === "VERIFIED") {
    filters.isVerified = true;
  }
  if (status === "PENDING") {
    filters.isVerified = false;
  }
  if (auth.user.role === "CITY_ADMIN") {
    filters.city = auth.user.city;
  }

  const banks = await BloodBankModel.find(filters)
    .sort({ createdAt: -1 })
    .populate("adminUserId", "name email phone")
    .lean();

  return ok({ banks });
}
