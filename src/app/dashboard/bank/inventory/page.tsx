import { ForbiddenCard } from "@/components/forbidden-card";
import { InventoryManager } from "@/components/bank/inventory-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BloodBankModel } from "@/models/blood-bank";
import { InventoryModel } from "@/models/inventory";

export default async function BankInventoryPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BLOOD_BANK_ADMIN") {
    return <ForbiddenCard message="This page is available to blood bank administrators." />;
  }

  await connectToDatabase();
  const bank = await BloodBankModel.findOne({ adminUserId: user._id }).select("_id city isVerified name").lean();
  if (!bank) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your bank profile first</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Go to Bank Profile and submit onboarding details before managing inventory.
        </CardContent>
      </Card>
    );
  }

  const items = await InventoryModel.find({ bankId: bank._id }).sort({ expiryDate: 1 }).lean();
  return (
    <InventoryManager
      city={bank.city}
      initialItems={items.map((item) => ({
        _id: item._id.toString(),
        bloodGroup: item.bloodGroup,
        units: item.units,
        expiryDate: item.expiryDate.toISOString(),
        batchId: item.batchId,
        isExpired: item.isExpired,
      }))}
    />
  );
}
