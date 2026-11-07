import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { getOrCreateConversation } from "@/lib/chat";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { ConversationModel } from "@/models/conversation";
import { DonationRequestModel } from "@/models/donation-request";
import { UserModel } from "@/models/user";
import { startConversationSchema } from "@/schemas/chat";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = startConversationSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  if (!Types.ObjectId.isValid(parsed.data.donorId)) {
    return fail("Invalid donor id", 400);
  }

  await connectToDatabase();

  const actor = await UserModel.findById(auth.user._id)
    .select("name role phone city")
    .lean();
  if (!actor) {
    return fail("Unauthorized", 401);
  }

  if (!["RECEIVER", "HOSPITAL"].includes(actor.role)) {
    return fail("Only receiver/hospital accounts can start donor chat from feed", 403);
  }

  const donor = await UserModel.findById(parsed.data.donorId)
    .select("name role bloodGroup city")
    .lean();
  if (!donor || donor.role !== "DONOR") {
    return fail("Donor not found", 404);
  }

  if (!donor.bloodGroup) {
    return fail("Selected donor profile is incomplete", 409);
  }

  const receiverId = actor._id.toString();
  const donorId = donor._id.toString();

  const existingConversation = await ConversationModel.findOne({
    donorId,
    receiverId,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .select("_id requestId")
    .lean();

  if (existingConversation) {
    return ok({
      conversationId: existingConversation._id.toString(),
      requestId: existingConversation.requestId.toString(),
      created: false,
    });
  }

  const directRequest = await DonationRequestModel.create({
    createdBy: actor._id,
    patientName: `Direct chat request by ${actor.name}`,
    hospitalName: actor.role === "HOSPITAL" ? actor.name : null,
    bloodGroup: donor.bloodGroup,
    units: 1,
    city: actor.city ?? donor.city ?? "Unknown",
    urgency: "NORMAL",
    contactPhone: actor.phone,
    neededByDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: "ACCEPTED",
    acceptedBy: donor._id,
    acceptedAt: new Date(),
    contactRevealedTo: [actor._id, donor._id],
  });

  const conversation = await getOrCreateConversation({
    requestId: directRequest._id,
    donorId: donor._id,
    receiverId: actor._id,
  });

  await createNotification({
    userId: donor._id,
    title: "New direct chat started",
    message: `${actor.name} started a chat session from donor feed.`,
    type: "INFO",
  });

  return ok(
    {
      conversationId: conversation._id.toString(),
      requestId: directRequest._id.toString(),
      created: true,
    },
    { status: 201 },
  );
}

