import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import { AppointmentModel } from "@/models/appointment";
import { BloodBankModel } from "@/models/blood-bank";
import { DonationRequestModel } from "@/models/donation-request";
import { appointmentCreateSchema } from "@/schemas/request";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const filters: Record<string, unknown> = {};

  if (auth.user.role === "DONOR") {
    filters.donorId = auth.user._id;
  }
  if (auth.user.role === "BLOOD_BANK_ADMIN") {
    const bank = await BloodBankModel.findOne({ adminUserId: auth.user._id }).select("_id");
    if (!bank) {
      return ok({ appointments: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    filters.bankId = bank._id;
  }

  const [appointments, total] = await Promise.all([
    AppointmentModel.find(filters)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("requestId", "patientName bloodGroup city urgency")
      .populate("donorId", "name phone bloodGroup city")
      .populate("bankId", "name city")
      .lean(),
    AppointmentModel.countDocuments(filters),
  ]);

  return ok({
    appointments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["DONOR", "BLOOD_BANK_ADMIN", "SUPER_ADMIN", "CITY_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const payload = parsed.data;

  if (!Types.ObjectId.isValid(payload.requestId) || !Types.ObjectId.isValid(payload.donorId)) {
    return fail("Invalid requestId or donorId", 400);
  }
  if (payload.bankId && !Types.ObjectId.isValid(payload.bankId)) {
    return fail("Invalid bankId", 400);
  }

  const donationRequest = await DonationRequestModel.findById(payload.requestId).select("status");
  if (!donationRequest || !["ACCEPTED", "SCHEDULED"].includes(donationRequest.status)) {
    return fail("Request is not ready for appointment", 409);
  }

  const appointment = await AppointmentModel.create({
    requestId: payload.requestId,
    donorId: payload.donorId,
    bankId: payload.bankId ?? null,
    scheduledAt: payload.scheduledAt,
    status: "PENDING",
  });

  await DonationRequestModel.findByIdAndUpdate(payload.requestId, {
    $set: { status: "SCHEDULED" },
  });

  return ok({ appointment }, { status: 201 });
}
