"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";
import { APPOINTMENT_STATUSES } from "@/lib/enums";

type AppointmentItem = {
  _id: string;
  donorName: string;
  donorPhone: string;
  bloodGroup: string;
  scheduledAt: string;
  status: string;
};

export function AppointmentsTable({ appointments }: { appointments: AppointmentItem[] }) {
  const router = useRouter();

  const updateStatus = async (id: string, status: (typeof APPOINTMENT_STATUSES)[number]) => {
    try {
      await fetchJson(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success("Appointment updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Scheduled At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length ? (
              appointments.map((appointment) => (
                <TableRow key={appointment._id}>
                  <TableCell>{appointment.donorName}</TableCell>
                  <TableCell>{appointment.donorPhone}</TableCell>
                  <TableCell>{appointment.bloodGroup}</TableCell>
                  <TableCell>{new Date(appointment.scheduledAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {appointment.status === "PENDING" ? (
                      <div className="inline-flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(appointment._id, "CONFIRMED")}>
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(appointment._id, "CANCELLED")}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  No appointments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
