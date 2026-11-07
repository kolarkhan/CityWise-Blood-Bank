"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";
import { REQUEST_STATUSES } from "@/lib/enums";

type RequestRow = {
  _id: string;
  patientName: string;
  bloodGroup: string;
  city: string;
  urgency: string;
  units: number;
  status: string;
};

export function AdminRequestsTable({ requests }: { requests: RequestRow[] }) {
  const router = useRouter();

  const updateStatus = async (requestId: string, status: (typeof REQUEST_STATUSES)[number]) => {
    try {
      await fetchJson(`/api/admin/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success("Request status updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Moderation</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Blood</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length ? (
              requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.patientName}</TableCell>
                  <TableCell>
                    {request.bloodGroup} ({request.units})
                  </TableCell>
                  <TableCell>{request.city}</TableCell>
                  <TableCell>{request.urgency}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(request._id, "COMPLETED")}>
                        Complete
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(request._id, "CANCELLED")}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
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
