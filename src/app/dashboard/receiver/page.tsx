import Link from "next/link";

import { ForbiddenCard } from "@/components/forbidden-card";
import { SearchBloodForm } from "@/components/forms/search-blood-form";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getReceiverDashboardData } from "@/lib/dashboard-data";

export default async function ReceiverDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !["RECEIVER", "HOSPITAL"].includes(user.role)) {
    return <ForbiddenCard message="This dashboard is available to receivers and hospitals." />;
  }

  const data = await getReceiverDashboardData(user._id.toString());

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Requests" value={data.myRequests} />
        <StatsCard title="Active Requests" value={data.activeRequests} />
        <StatsCard title="Completed Requests" value={data.completed} />
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href="/request/new">
          <Button>New Request</Button>
        </Link>
        <Link href="/dashboard/receiver/requests">
          <Button variant="outline">View All Requests</Button>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">City Search</h2>
        <SearchBloodForm />
      </div>
    </div>
  );
}
