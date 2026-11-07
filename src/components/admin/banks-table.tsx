"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";

type BankRow = {
  _id: string;
  name: string;
  city: string;
  licenseNo: string;
  contactPhone: string;
  isVerified: boolean;
  rejectionReason?: string | null;
};

export function AdminBanksTable({ banks }: { banks: BankRow[] }) {
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");

  const verify = async (bankId: string, action: "APPROVE" | "REJECT") => {
    try {
      await fetchJson(`/api/admin/banks/${bankId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECT" ? rejectReason || "Incomplete documentation" : undefined,
        }),
      });
      toast.success(action === "APPROVE" ? "Bank approved" : "Bank rejected");
      setRejectReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blood Bank Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Rejection reason (used when Reject is clicked)"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length ? (
              banks.map((bank) => (
                <TableRow key={bank._id}>
                  <TableCell>{bank.name}</TableCell>
                  <TableCell>{bank.city}</TableCell>
                  <TableCell>{bank.licenseNo}</TableCell>
                  <TableCell>{bank.contactPhone}</TableCell>
                  <TableCell>
                    <StatusBadge status={bank.isVerified ? "VERIFIED" : "PENDING"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" onClick={() => verify(bank._id, "APPROVE")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => verify(bank._id, "REJECT")}>
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No banks to verify.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
