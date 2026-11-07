import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { DonationRequestModel } from "@/models/donation-request";
import { updateRequestStatusSchema } from "@/schemas/request";
import { logAudit } from "@/lib/audit";

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
    return fail("Invalid request id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = updateRequestStatusSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const updated = await DonationRequestModel.findByIdAndUpdate(
    id,
    { $set: { status: parsed.data.status } },
    { new: true },
  );
  if (!updated) {
    return fail("Request not found", 404);
  }

  await logAudit({
    actorId: auth.user._id,
    action: "REQUEST_STATUS_UPDATED",
    entityType: "DonationRequest",
    entityId: updated._id,
    meta: { status: parsed.data.status },
  });

  return ok({ request: updated });
}
