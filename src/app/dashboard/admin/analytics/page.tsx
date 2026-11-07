import { ForbiddenCard } from "@/components/forbidden-card";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DonationRequestModel } from "@/models/donation-request";
import { InventoryModel } from "@/models/inventory";
import { UserModel } from "@/models/user";

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "CITY_ADMIN"].includes(user.role)) {
    return <ForbiddenCard message="This page is available to admins only." />;
  }

  await connectToDatabase();
  const cityFilter = user.role === "CITY_ADMIN" ? { city: user.city } : {};

  const [cityWiseDonors, bloodGroups, emergency] = await Promise.all([
    UserModel.aggregate([
      { $match: { role: "DONOR", ...cityFilter } },
      { $group: { _id: "$city", total: { $sum: 1 }, available: { $sum: { $cond: ["$isAvailable", 1, 0] } } } },
      { $sort: { total: -1 } },
    ]),
    InventoryModel.aggregate([
      { $match: { isExpired: false, ...cityFilter } },
      { $group: { _id: "$bloodGroup", units: { $sum: "$units" } } },
      { $sort: { units: -1 } },
    ]),
    DonationRequestModel.aggregate([
      { $match: { urgency: "EMERGENCY", ...cityFilter } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $in: ["$status", ["ACCEPTED", "SCHEDULED", "COMPLETED"]] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const totalEmergency = emergency[0]?.total ?? 0;
  const successfulEmergency = emergency[0]?.successful ?? 0;
  const emergencySuccessRate = totalEmergency ? Math.round((successfulEmergency / totalEmergency) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Emergency Requests" value={totalEmergency} />
        <StatsCard title="Emergency Success" value={`${emergencySuccessRate}%`} />
        <StatsCard title="Available Donor Cities" value={cityWiseDonors.length} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>City-wise Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Total Donors</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cityWiseDonors.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>{row._id}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.available}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blood Group Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bloodGroups.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>{row._id}</TableCell>
                    <TableCell>{row.units}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
