import { Types } from "mongoose";
import { redirect } from "next/navigation";

import { RequestChat } from "@/components/chat/request-chat";
import { ForbiddenCard } from "@/components/forbidden-card";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { DonationRequestModel } from "@/models/donation-request";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DonorRequestChatPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DONOR") {
    return <ForbiddenCard message="Donor access is required for chat." />;
  }
  if (!isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup })) {
    redirect(DONOR_ONBOARDING_PATH);
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return <ForbiddenCard message="Invalid request id." />;
  }

  await connectToDatabase();
  const requestDoc = await DonationRequestModel.findById(id).select(
    "_id patientName contactRevealedTo acceptedBy emergencyAcceptedBy",
  );

  if (!requestDoc) {
    return <ForbiddenCard message="Request not found." />;
  }

  const donorId = user._id.toString();
  const canChat = (requestDoc.contactRevealedTo ?? []).some((item) => item.toString() === donorId);
  if (!canChat) {
    return <ForbiddenCard message="Chat is not available for this request yet." />;
  }

  return (
    <RequestChat
      requestId={id}
      currentUserId={donorId}
      title={`Communication - ${requestDoc.patientName}`}
    />
  );
}
