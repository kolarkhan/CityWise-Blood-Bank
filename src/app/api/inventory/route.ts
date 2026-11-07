import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import { BloodBankModel } from "@/models/blood-bank";
import { InventoryModel } from "@/models/inventory";
import { inventoryCreateSchema } from "@/schemas/inventory";

async function resolveBankId(userId: Types.ObjectId) {
  const bank = await BloodBankModel.findOne({ adminUserId: userId }).select("_id isVerified city");
  return bank;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const city = request.nextUrl.searchParams.get("city");
  const bloodGroup = request.nextUrl.searchParams.get("bloodGroup");

  const filters: Record<string, unknown> = {};
  if (city) {
    filters.city = city;
  }
  if (bloodGroup) {
    filters.bloodGroup = bloodGroup;
  }
  if (auth.user.role === "BLOOD_BANK_ADMIN") {
    const bank = await resolveBankId(auth.user._id);
    if (!bank) {
      return ok({
        inventory: [],
        lowStockCount: 0,
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }
    filters.bankId = bank._id;
  }

  const [inventory, total, lowStockCount] = await Promise.all([
    InventoryModel.find(filters)
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(limit)
      .populate("bankId", "name city isVerified")
      .lean(),
    InventoryModel.countDocuments(filters),
    InventoryModel.countDocuments({ ...filters, units: { $lte: LOW_STOCK_THRESHOLD }, isExpired: false }),
  ]);

  return ok({
    inventory,
    lowStockCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = inventoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const payload = parsed.data;

  let bankId = payload.bankId;
  if (auth.user.role === "BLOOD_BANK_ADMIN") {
    const bank = await resolveBankId(auth.user._id);
    if (!bank) {
      return fail("No blood bank found for this user", 404);
    }
    if (!bank.isVerified) {
      return fail("Blood bank is not verified by admin yet", 403);
    }
    bankId = bank._id.toString();
  }

  if (!bankId || !Types.ObjectId.isValid(bankId)) {
    return fail("Valid bankId is required", 422);
  }

  const inventoryItem = await InventoryModel.create({
    bankId,
    city: payload.city,
    bloodGroup: payload.bloodGroup,
    units: payload.units,
    expiryDate: payload.expiryDate,
    batchId: payload.batchId ?? null,
    isExpired: payload.expiryDate < new Date() || payload.units <= 0,
  });

  return ok({ inventory: inventoryItem }, { status: 201 });
}
