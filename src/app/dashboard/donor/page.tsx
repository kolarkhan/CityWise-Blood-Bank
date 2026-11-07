import { ForbiddenCard } from "@/components/forbidden-card";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDonorDashboardData } from "@/lib/dashboard-data";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { redirect } from "next/navigation";

export default async function DonorDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DONOR") {
    return <ForbiddenCard message="This dashboard is only available to donors." />;
  }
  if (!isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup })) {
    redirect(DONOR_ONBOARDING_PATH);
  }

  const data = await getDonorDashboardData(user._id.toString());

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Open Requests" value={data.openRequests} />
        <StatsCard title="Accepted Requests" value={data.acceptedRequests} />
        <StatsCard title="Availability" value={user.isAvailable ? "Available" : "Not Available"} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.notifications.length ? (
            data.notifications.map((notification) => (
              <div key={notification._id.toString()} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{notification.title}</p>
                <p className="text-sm text-slate-600">{notification.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
