import Link from "next/link";
import { redirect } from "next/navigation";

import { ForbiddenCard } from "@/components/forbidden-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DONOR_ONBOARDING_PATH, isDonorProfileComplete } from "@/lib/donor";
import { DonationRequestModel } from "@/models/donation-request";

export default async function DonorHistoryPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DONOR") {
    return <ForbiddenCard message="Donor access is required." />;
  }
  if (!isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup })) {
    redirect(DONOR_ONBOARDING_PATH);
  }

  await connectToDatabase();
  const history = await DonationRequestModel.find({ acceptedBy: user._id })
    .sort({ acceptedAt: -1 })
    .lean();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donation History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Accepted At</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length ? (
              history.map((item) => (
                <TableRow key={item._id.toString()}>
                  <TableCell>{item.patientName}</TableCell>
                  <TableCell>{item.bloodGroup}</TableCell>
                  <TableCell>{item.urgency}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.acceptedAt ? new Date(item.acceptedAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/donor/requests/${item._id.toString()}/chat`}>
                      <Button size="sm" variant="outline">
                        Chat
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No donation history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
