import { OpenTopbarChatButton } from "@/components/chat/open-topbar-chat-button";
import { ForbiddenCard } from "@/components/forbidden-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { DonationRequestModel } from "@/models/donation-request";

export default async function ReceiverRequestsPage() {
  const user = await getCurrentUser();
  if (!user || !["RECEIVER", "HOSPITAL"].includes(user.role)) {
    return <ForbiddenCard message="This page is available to receivers and hospitals." />;
  }

  await connectToDatabase();
  const requests = await DonationRequestModel.find({ createdBy: user._id })
    .sort({ createdAt: -1 })
    .populate("acceptedBy", "name phone")
    .lean();

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Blood</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Accepted By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length ? (
              requests.map((request) => (
                <TableRow key={request._id.toString()}>
                  <TableCell>{request.patientName}</TableCell>
                  <TableCell>
                    {request.bloodGroup} ({request.units} units)
                  </TableCell>
                  <TableCell>{request.urgency}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    {request.acceptedBy && typeof request.acceptedBy === "object" ? request.acceptedBy.name : "-"}
                  </TableCell>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {request.acceptedBy ? (
                      <OpenTopbarChatButton
                        requestId={request._id.toString()}
                        className="h-8 w-8 border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500">
                  No requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
