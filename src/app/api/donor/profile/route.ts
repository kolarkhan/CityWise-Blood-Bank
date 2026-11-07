import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { getDonorEligibility } from "@/lib/donor";
import { fail, ok } from "@/lib/http";
import { UserModel } from "@/models/user";
import { donorProfileUpdateSchema } from "@/schemas/donor";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["DONOR"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const donor = await UserModel.findById(auth.user._id).select("-passwordHash").lean();
  if (!donor) {
    return fail("Donor not found", 404);
  }

  const eligibility = getDonorEligibility(donor.lastDonationDate);
  return ok({
    donor,
    eligibility,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["DONOR"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = donorProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const updatePayload = parsed.data;
  const currentDonor = await UserModel.findById(auth.user._id)
    .select("lastDonationDate isAvailable")
    .lean();
  if (!currentDonor) {
    return fail("Donor not found", 404);
  }

  const effectiveLastDonationDate = updatePayload.lastDonationDate ?? currentDonor.lastDonationDate ?? null;
  const eligibility = getDonorEligibility(effectiveLastDonationDate);

  const setPayload: Record<string, unknown> = { ...updatePayload };
  // If cooldown is active, donor must remain unavailable.
  if (!eligibility.isEligible) {
    setPayload.isAvailable = false;
  }

  const donor = await UserModel.findByIdAndUpdate(
    auth.user._id,
    {
      $set: setPayload,
    },
    { new: true },
  )
    .select("-passwordHash")
    .lean();

  return ok({
    donor,
    eligibility,
  });
}
