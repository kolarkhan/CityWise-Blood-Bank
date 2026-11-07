import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { getDonorEligibility } from "@/lib/donor";
import { fail, ok } from "@/lib/http";
import { UserModel } from "@/models/user";
import { donorAvailabilitySchema } from "@/schemas/donor";

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

  const parsed = donorAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const donor = await UserModel.findById(auth.user._id);
  if (!donor) {
    return fail("Donor not found", 404);
  }

  const eligibility = getDonorEligibility(donor.lastDonationDate);
  if (!eligibility.isEligible && parsed.data.isAvailable) {
    return fail("You are not eligible yet based on your last donation date", 409, {
      nextEligibleDate: eligibility.nextEligibleDate,
    });
  }

  donor.isAvailable = parsed.data.isAvailable;
  await donor.save();

  return ok({
    isAvailable: donor.isAvailable,
    nextEligibleDate: eligibility.nextEligibleDate,
  });
}
