import { subDays } from "date-fns";
import { redirect } from "next/navigation";

import { DonorRequestList } from "@/components/donor/donor-request-list";
import { ForbiddenCard } from "@/components/forbidden-card";
import { DONATION_COOLDOWN_DAYS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { getCurrentUser } from "@/lib/auth";
import { DonationRequestModel } from "@/models/donation-request";

export default async function DonorRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DONOR") {
    return <ForbiddenCard message="Donor access is required." />;
  }
  if (!isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup })) {
    redirect(DONOR_ONBOARDING_PATH);
  }

  await connectToDatabase();
  const eligibleBefore = subDays(new Date(), DONATION_COOLDOWN_DAYS);
  const isEligible = !user.lastDonationDate || user.lastDonationDate <= eligibleBefore;
  if (!isEligible) {
    return <ForbiddenCard message="You are currently in cooldown period and cannot accept new requests." />;
  }

  const requests = await DonationRequestModel.find({
    city: user.city,
    bloodGroup: user.bloodGroup,
    $or: [
      {
        status: { $in: ["OPEN", "MATCHING"] },
        acceptedBy: null,
      },
      {
        status: { $in: ["OPEN", "MATCHING", "ACCEPTED", "SCHEDULED", "COMPLETED"] },
        acceptedBy: user._id,
      },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const safeRequests = requests.map((request) => ({
    // We only pass plain serializable values into client component props.
    acceptedByMe:
      request.acceptedBy instanceof Object
        ? request.acceptedBy.toString() === user._id.toString()
        : false,
    _id: request._id.toString(),
    patientName: request.patientName,
    city: request.city,
    bloodGroup: request.bloodGroup,
    urgency: request.urgency,
    status: request.status,
    units: request.units,
    neededByDate: new Date(request.neededByDate).toISOString(),
  })).map((request) => ({
    ...request,
    canAccept: ["OPEN", "MATCHING"].includes(request.status) && !request.acceptedByMe,
    canChat:
      request.acceptedByMe &&
      ["ACCEPTED", "SCHEDULED", "COMPLETED", "MATCHING"].includes(request.status),
  }));

  return <DonorRequestList requests={safeRequests} />;
}
