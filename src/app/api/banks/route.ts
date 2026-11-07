import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { BloodBankModel } from "@/models/blood-bank";
import { UserModel } from "@/models/user";
import { bankOnboardingSchema } from "@/schemas/bank";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const city = params.get("city");
  const verified = params.get("verified");

  await connectToDatabase();

  const filters: Record<string, unknown> = {};
  if (city) {
    filters.city = city;
  }
  if (verified === "true") {
    filters.isVerified = true;
  }
  if (verified === "false") {
    filters.isVerified = false;
  }

  const banks = await BloodBankModel.find(filters)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return ok({ banks });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = bankOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();

  const existingForAdmin = await BloodBankModel.findOne({ adminUserId: auth.user._id }).select("_id");
  if (existingForAdmin) {
    return fail("A blood bank is already registered for this account", 409);
  }

  const existingLicense = await BloodBankModel.findOne({ licenseNo: parsed.data.licenseNo }).select("_id");
  if (existingLicense) {
    return fail("License number already exists", 409);
  }

  const bank = await BloodBankModel.create({
    ...parsed.data,
    adminUserId: auth.user._id,
    isVerified: false,
  });

  await UserModel.findByIdAndUpdate(auth.user._id, { $set: { managedBankId: bank._id } });

  return ok({ bank }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["BLOOD_BANK_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = bankOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const bank = await BloodBankModel.findOneAndUpdate(
    { adminUserId: auth.user._id },
    {
      $set: {
        ...parsed.data,
        isVerified: false,
      },
    },
    { new: true },
  );
  if (!bank) {
    return fail("No blood bank profile found. Use POST to create one.", 404);
  }

  return ok({ bank });
}
