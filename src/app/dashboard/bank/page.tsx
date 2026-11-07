import Link from "next/link";

import { ForbiddenCard } from "@/components/forbidden-card";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getBankDashboardData } from "@/lib/dashboard-data";

export default async function BankDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BLOOD_BANK_ADMIN") {
    return <ForbiddenCard message="This dashboard is available to blood bank administrators." />;
  }

  const data = await getBankDashboardData(user._id.toString());

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Inventory Items" value={data.inventoryCount} />
        <StatsCard title="Low Stock Alerts" value={data.lowStockCount} />
        <StatsCard title="Pending Appointments" value={data.appointmentsPending} />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">{data.bank?.name ?? "No bank profile submitted yet"}</p>
            <p className="text-sm text-slate-500">{data.bank?.city ?? "Complete profile to proceed."}</p>
          </div>
          <StatusBadge status={data.bank?.isVerified ? "VERIFIED" : "PENDING"} />
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Link href="/dashboard/bank/profile">
          <Button variant="outline">Manage Profile</Button>
        </Link>
        <Link href="/dashboard/bank/inventory">
          <Button>Manage Inventory</Button>
        </Link>
      </div>
    </div>
  );
}
