import { ForbiddenCard } from "@/components/forbidden-card";
import { BankProfileForm } from "@/components/bank/bank-profile-form";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BloodBankModel } from "@/models/blood-bank";

export default async function BankProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BLOOD_BANK_ADMIN") {
    return <ForbiddenCard message="This page is available to blood bank administrators." />;
  }

  await connectToDatabase();
  const bank = await BloodBankModel.findOne({ adminUserId: user._id }).lean();

  return (
    <BankProfileForm
      initial={
        bank
          ? {
              _id: bank._id.toString(),
              name: bank.name,
              city: bank.city,
              licenseNo: bank.licenseNo,
              contactPhone: bank.contactPhone,
              address: bank.address,
              operatingHours: bank.operatingHours ?? "",
              profileImage: bank.profileImage ?? null,
              coverImage: bank.coverImage ?? null,
              geo: {
                lat: typeof bank.geo?.lat === "number" ? bank.geo.lat : null,
                lng: typeof bank.geo?.lng === "number" ? bank.geo.lng : null,
              },
            }
          : null
      }
    />
  );
}
