import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { logAudit } from "@/lib/audit";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { BloodBankModel } from "@/models/blood-bank";
import { bankVerificationSchema } from "@/schemas/bank";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAuth(request, ["SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid bank id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = bankVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const bank = await BloodBankModel.findById(id);
  if (!bank) {
    return fail("Bank not found", 404);
  }
  if (auth.user.role === "CITY_ADMIN" && bank.city !== auth.user.city) {
    return fail("Forbidden", 403);
  }

  if (parsed.data.action === "APPROVE") {
    bank.isVerified = true;
    bank.rejectionReason = null;
    bank.verifiedBy = auth.user._id;
    bank.verifiedAt = new Date();
  } else {
    bank.isVerified = false;
    bank.rejectionReason = parsed.data.rejectionReason ?? "License validation failed";
    bank.verifiedBy = auth.user._id;
    bank.verifiedAt = new Date();
  }

  await bank.save();

  await Promise.all([
    createNotification({
      userId: bank.adminUserId,
      title: parsed.data.action === "APPROVE" ? "Blood bank approved" : "Blood bank rejected",
      message:
        parsed.data.action === "APPROVE"
          ? "Your blood bank is verified. You can now manage active inventory."
          : `Verification rejected: ${bank.rejectionReason}`,
      type: parsed.data.action === "APPROVE" ? "SUCCESS" : "ERROR",
    }),
    logAudit({
      actorId: auth.user._id,
      action: parsed.data.action === "APPROVE" ? "BANK_APPROVED" : "BANK_REJECTED",
      entityType: "BloodBank",
      entityId: bank._id,
      meta: { rejectionReason: bank.rejectionReason },
    }),
  ]);

  return ok({ bank });
}
