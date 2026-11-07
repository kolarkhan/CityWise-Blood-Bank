import { ForbiddenCard } from "@/components/forbidden-card";
import { AdminRequestsTable } from "@/components/admin/requests-table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DonationRequestModel } from "@/models/donation-request";

export default async function AdminRequestsPage() {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "CITY_ADMIN"].includes(user.role)) {
    return <ForbiddenCard message="This page is available to admins only." />;
  }

  await connectToDatabase();
  const filters = user.role === "CITY_ADMIN" ? { city: user.city } : {};
  const requests = await DonationRequestModel.find(filters).sort({ createdAt: -1 }).limit(200).lean();

  return (
    <AdminRequestsTable
      requests={requests.map((request) => ({
        _id: request._id.toString(),
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        city: request.city,
        urgency: request.urgency,
        units: request.units,
        status: request.status,
      }))}
    />
  );
}
