import { subDays } from "date-fns";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { DONATION_COOLDOWN_DAYS, EMERGENCY_DEFAULT_SLOT_COUNT } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { parsePagination } from "@/lib/pagination";
import { logAudit } from "@/lib/audit";
import { DonationRequestModel } from "@/models/donation-request";
import { UserModel } from "@/models/user";
import { createRequestSchema } from "@/schemas/request";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status");
  const city = request.nextUrl.searchParams.get("city");

  const filters: Record<string, unknown> = {};
  if (status) {
    filters.status = status;
  }
  if (city) {
    filters.city = city;
  }

  if (auth.user.role === "DONOR") {
    if (!auth.user.bloodGroup) {
      return ok({ requests: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    filters.bloodGroup = auth.user.bloodGroup;
    filters.city = auth.user.city;
    filters.status = { $in: ["OPEN", "MATCHING"] };
    filters.$or = [{ acceptedBy: null }, { acceptedBy: auth.user._id }];
  } else if (["RECEIVER", "HOSPITAL"].includes(auth.user.role)) {
    filters.createdBy = auth.user._id;
  } else if (auth.user.role === "BLOOD_BANK_ADMIN") {
    filters.city = auth.user.city;
  }

  const [requests, total] = await Promise.all([
    DonationRequestModel.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name role")
      .populate("acceptedBy", "name phone city")
      .lean(),
    DonationRequestModel.countDocuments(filters),
  ]);

  return ok({
    requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["RECEIVER", "HOSPITAL", "CITY_ADMIN", "SUPER_ADMIN"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  const payload = parsed.data;
  await connectToDatabase();

  let notifiedDonors: string[] = [];
  let status: "OPEN" | "MATCHING" = payload.urgency === "EMERGENCY" ? "MATCHING" : "OPEN";

  if (payload.urgency === "EMERGENCY") {
    const eligibleBefore = subDays(new Date(), DONATION_COOLDOWN_DAYS);
    const donors = await UserModel.find({
      role: "DONOR",
      isBlocked: false,
      isAvailable: true,
      city: payload.city,
      bloodGroup: payload.bloodGroup,
      $or: [{ lastDonationDate: null }, { lastDonationDate: { $lte: eligibleBefore } }],
    })
      .select("_id")
      .limit(100)
      .lean();

    notifiedDonors = donors.map((donor) => donor._id.toString());
    status = "MATCHING";
  }

  const requestDoc = await DonationRequestModel.create({
    createdBy: auth.user._id,
    patientName: payload.patientName,
    hospitalName: payload.hospitalName ?? null,
    bloodGroup: payload.bloodGroup,
    units: payload.units,
    city: payload.city,
    urgency: payload.urgency,
    contactPhone: payload.contactPhone,
    neededByDate: payload.neededByDate,
    status,
    notifiedDonors,
    maxEmergencyAcceptances: payload.maxEmergencyAcceptances ?? EMERGENCY_DEFAULT_SLOT_COUNT,
  });

  await logAudit({
    actorId: auth.user._id,
    action: "REQUEST_CREATED",
    entityType: "DonationRequest",
    entityId: requestDoc._id,
    meta: {
      urgency: payload.urgency,
      city: payload.city,
      bloodGroup: payload.bloodGroup,
    },
  });

  if (payload.urgency === "EMERGENCY" && notifiedDonors.length) {
    await Promise.all(
      notifiedDonors.map((donorId) =>
        createNotification({
          userId: donorId,
          title: "Emergency blood request",
          message: `Urgent ${payload.bloodGroup} request in ${payload.city}. Open your dashboard to accept.`,
          type: "WARNING",
        }),
      ),
    );
  }

  return ok({ request: requestDoc }, { status: 201 });
}
