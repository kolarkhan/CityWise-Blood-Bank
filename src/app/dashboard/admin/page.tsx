import Link from "next/link";

import { ForbiddenCard } from "@/components/forbidden-card";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/dashboard-data";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "CITY_ADMIN"].includes(user.role)) {
    return <ForbiddenCard message="This dashboard is available to admins only." />;
  }

  const data = await getAdminDashboardData(user.role, user.city);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Users" value={data.users} />
        <StatsCard title="Pending Banks" value={data.pendingBanks} />
        <StatsCard title="Open Requests" value={data.openRequests} />
        <StatsCard title="Low Stock Items" value={data.lowStock} />
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/admin/users">
          <Button variant="outline">Manage Users</Button>
        </Link>
        <Link href="/dashboard/admin/banks">
          <Button variant="outline">Verify Banks</Button>
        </Link>
        <Link href="/dashboard/admin/requests">
          <Button variant="outline">Moderate Requests</Button>
        </Link>
        <Link href="/dashboard/admin/analytics">
          <Button>View Analytics</Button>
        </Link>
      </div>
    </div>
  );
}
