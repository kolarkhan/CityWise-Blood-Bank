import Link from "next/link";
import { Types } from "mongoose";

import { RequestChat } from "@/components/chat/request-chat";
import { ForbiddenCard } from "@/components/forbidden-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DonationRequestModel } from "@/models/donation-request";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ donorId?: string }>;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

export default async function ReceiverRequestChatPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !["RECEIVER", "HOSPITAL"].includes(user.role)) {
    return <ForbiddenCard message="Receiver or hospital access is required for chat." />;
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return <ForbiddenCard message="Invalid request id." />;
  }

  const { donorId: donorIdInput } = await searchParams;

  await connectToDatabase();
  const requestDoc = await DonationRequestModel.findById(id)
    .select("_id createdBy patientName acceptedBy emergencyAcceptedBy")
    .populate("acceptedBy", "name")
    .populate("emergencyAcceptedBy", "name")
    .lean();

  if (!requestDoc) {
    return <ForbiddenCard message="Request not found." />;
  }

  if (requestDoc.createdBy.toString() !== user._id.toString()) {
    return <ForbiddenCard message="You are not allowed to access this request chat." />;
  }

  const acceptedDonorsRaw = [
    requestDoc.acceptedBy,
    ...(Array.isArray(requestDoc.emergencyAcceptedBy) ? requestDoc.emergencyAcceptedBy : []),
  ].filter(Boolean);

  const acceptedDonors = unique(
    acceptedDonorsRaw
      .map((item) => {
        if (!item) return null;
        if (item instanceof Types.ObjectId) return item.toString();
        if (typeof item === "object" && "_id" in item && item._id) {
          return item._id.toString();
        }
        return null;
      })
      .filter((value): value is string => Boolean(value)),
  );

  if (!acceptedDonors.length) {
    return <ForbiddenCard message="No donor has accepted this request yet." />;
  }

  const selectedDonorId =
    donorIdInput && acceptedDonors.includes(donorIdInput) ? donorIdInput : acceptedDonors[0];

  return (
    <div className="space-y-4">
      {acceptedDonors.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Badge variant="info">Select Donor</Badge>
          {acceptedDonors.map((donorId) => (
            <Link
              key={donorId}
              href={`/dashboard/receiver/requests/${id}/chat?donorId=${donorId}`}
            >
              <Button
                size="sm"
                variant={donorId === selectedDonorId ? "default" : "outline"}
              >
                Donor {donorId.slice(-4)}
              </Button>
            </Link>
          ))}
        </div>
      ) : null}

      <RequestChat
        requestId={id}
        donorId={selectedDonorId}
        currentUserId={user._id.toString()}
        title={`Communication - ${requestDoc.patientName}`}
      />
    </div>
  );
}
