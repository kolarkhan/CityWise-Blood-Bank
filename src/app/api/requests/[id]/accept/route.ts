import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { getDonorEligibility, isDonorProfileComplete } from "@/lib/donor";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { getOrCreateConversation } from "@/lib/chat";
import { DonationRequestModel } from "@/models/donation-request";
import { UserModel } from "@/models/user";
import { logAudit } from "@/lib/audit";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAuth(request, ["DONOR"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid request id", 400);
  }

  await connectToDatabase();
  const donor = await UserModel.findById(auth.user._id).select(
    "_id name bloodGroup city isAvailable lastDonationDate",
  );
  if (!donor || !isDonorProfileComplete({ name: donor.name, city: donor.city, bloodGroup: donor.bloodGroup })) {
    return fail("Donor profile is incomplete", 422);
  }

  const eligibility = getDonorEligibility(donor.lastDonationDate);
  if (!donor.isAvailable || !eligibility.isEligible) {
    return fail("You are currently not eligible to donate", 409, {
      nextEligibleDate: eligibility.nextEligibleDate,
    });
  }

  const requestDoc = await DonationRequestModel.findById(id).select("city bloodGroup urgency status");
  if (!requestDoc) {
    return fail("Request not found", 404);
  }

  if (requestDoc.city !== donor.city || requestDoc.bloodGroup !== donor.bloodGroup) {
    return fail("This request does not match your donor profile", 403);
  }

  if (requestDoc.urgency === "NORMAL") {
    const updated = await DonationRequestModel.findOneAndUpdate(
      {
        _id: id,
        urgency: "NORMAL",
        status: { $in: ["OPEN", "MATCHING"] },
        acceptedBy: null,
      },
      {
        $set: {
          acceptedBy: donor._id,
          acceptedAt: new Date(),
          status: "ACCEPTED",
        },
        $addToSet: {
          contactRevealedTo: donor._id,
        },
      },
      { new: true },
    );

    if (!updated) {
      return fail("Request already accepted by another donor", 409);
    }

    await Promise.all([
      getOrCreateConversation({
        requestId: updated._id,
        donorId: donor._id,
        receiverId: updated.createdBy,
      }),
      createNotification({
        userId: updated.createdBy,
        title: "Blood request accepted",
        message: "A donor accepted your request. Chat is now available in your request details.",
        type: "SUCCESS",
      }),
      createNotification({
        userId: donor._id,
        title: "Request accepted",
        message: "You accepted a blood donation request successfully. Open chat to coordinate.",
        type: "SUCCESS",
      }),
      logAudit({
        actorId: donor._id,
        action: "REQUEST_ACCEPTED",
        entityType: "DonationRequest",
        entityId: updated._id,
        meta: { urgency: "NORMAL" },
      }),
    ]);

    return ok({
      accepted: true,
      requestId: updated._id,
      contactPhone: updated.contactPhone,
      urgency: "NORMAL",
      status: updated.status,
    });
  }

  const emergencyUpdated = await DonationRequestModel.findOneAndUpdate(
    {
      _id: id,
      urgency: "EMERGENCY",
      status: { $in: ["OPEN", "MATCHING"] },
      emergencyAcceptedBy: { $ne: donor._id },
      $expr: {
        $lt: [{ $size: "$emergencyAcceptedBy" }, "$maxEmergencyAcceptances"],
      },
    },
    {
      $addToSet: {
        emergencyAcceptedBy: donor._id,
        contactRevealedTo: donor._id,
      },
      $setOnInsert: {},
      $set: {
        acceptedBy: donor._id,
        acceptedAt: new Date(),
        status: "MATCHING",
      },
    },
    { new: true },
  );

  if (!emergencyUpdated) {
    return fail("Emergency slots are full or request is closed", 409);
  }

  let finalStatus = emergencyUpdated.status;
  if (
    emergencyUpdated.emergencyAcceptedBy.length >= emergencyUpdated.maxEmergencyAcceptances &&
    emergencyUpdated.status !== "ACCEPTED"
  ) {
    const finalDoc = await DonationRequestModel.findByIdAndUpdate(
      emergencyUpdated._id,
      { $set: { status: "ACCEPTED" } },
      { new: true },
    );
    if (finalDoc) {
      finalStatus = finalDoc.status;
    }
  }

  await Promise.all([
    getOrCreateConversation({
      requestId: emergencyUpdated._id,
      donorId: donor._id,
      receiverId: emergencyUpdated.createdBy,
    }),
    createNotification({
      userId: emergencyUpdated.createdBy,
      title: "Emergency donor matched",
      message: `${emergencyUpdated.emergencyAcceptedBy.length} donor(s) accepted your emergency request. Chat is available now.`,
      type: "WARNING",
    }),
    createNotification({
      userId: donor._id,
      title: "Emergency slot confirmed",
      message: "You secured an emergency response slot. Use chat to coordinate quickly.",
      type: "SUCCESS",
    }),
    logAudit({
      actorId: donor._id,
      action: "EMERGENCY_REQUEST_ACCEPTED",
      entityType: "DonationRequest",
      entityId: emergencyUpdated._id,
      meta: {
        acceptedCount: emergencyUpdated.emergencyAcceptedBy.length,
        max: emergencyUpdated.maxEmergencyAcceptances,
      },
    }),
  ]);

  return ok({
    accepted: true,
    requestId: emergencyUpdated._id,
    urgency: "EMERGENCY",
    acceptedCount: emergencyUpdated.emergencyAcceptedBy.length,
    maxSlots: emergencyUpdated.maxEmergencyAcceptances,
    status: finalStatus,
    contactPhone: emergencyUpdated.contactPhone,
  });
}
