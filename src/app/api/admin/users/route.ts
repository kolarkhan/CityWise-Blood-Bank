import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import { UserModel } from "@/models/user";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const role = request.nextUrl.searchParams.get("role");
  const city = request.nextUrl.searchParams.get("city");

  const filters: Record<string, unknown> = {};
  if (role) {
    filters.role = role;
  }
  if (city) {
    filters.city = city;
  }
  if (auth.user.role === "CITY_ADMIN") {
    filters.city = auth.user.city;
  }

  const [users, total] = await Promise.all([
    UserModel.find(filters).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    UserModel.countDocuments(filters),
  ]);

  return ok({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
