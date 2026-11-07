import { ForbiddenCard } from "@/components/forbidden-card";
import { AdminBanksTable } from "@/components/admin/banks-table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BloodBankModel } from "@/models/blood-bank";

export default async function AdminBanksPage() {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "CITY_ADMIN"].includes(user.role)) {
    return <ForbiddenCard message="This page is available to admins only." />;
  }

  await connectToDatabase();
  const filters = user.role === "CITY_ADMIN" ? { city: user.city } : {};
  const banks = await BloodBankModel.find(filters).sort({ createdAt: -1 }).lean();

  return (
    <AdminBanksTable
      banks={banks.map((bank) => ({
        _id: bank._id.toString(),
        name: bank.name,
        city: bank.city,
        licenseNo: bank.licenseNo,
        contactPhone: bank.contactPhone,
        isVerified: bank.isVerified,
        rejectionReason: bank.rejectionReason,
      }))}
    />
  );
}
