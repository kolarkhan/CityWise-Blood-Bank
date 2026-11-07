"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { OpenTopbarChatButton } from "@/components/chat/open-topbar-chat-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";

type RequestItem = {
  _id: string;
  patientName: string;
  city: string;
  bloodGroup: string;
  urgency: string;
  status: string;
  units: number;
  neededByDate: string;
  canAccept: boolean;
  canChat: boolean;
};

export function DonorRequestList({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const acceptRequest = async (requestId: string) => {
    try {
      setLoadingId(requestId);
      await fetchJson(`/api/requests/${requestId}/accept`, {
        method: "POST",
      });
      toast.success("Request accepted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to accept request");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matching Requests</CardTitle>
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
              <TableHead>Needed By</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length ? (
              requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.patientName}</TableCell>
                  <TableCell>
                    {request.bloodGroup} ({request.units} units)
                  </TableCell>
                  <TableCell>{request.city}</TableCell>
                  <TableCell>{request.urgency}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>{new Date(request.neededByDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      {request.canAccept ? (
                        <Button
                          size="sm"
                          onClick={() => acceptRequest(request._id)}
                          disabled={loadingId === request._id}
                        >
                          {loadingId === request._id ? "Accepting..." : "Accept"}
                        </Button>
                      ) : null}
                      {request.canChat ? (
                        <OpenTopbarChatButton
                          requestId={request._id}
                          className="h-8 w-8 border-slate-300 text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500">
                  No requests match your profile right now.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
