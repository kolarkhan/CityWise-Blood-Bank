import { ForbiddenCard } from "@/components/forbidden-card";
import { AppointmentsTable } from "@/components/bank/appointments-table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/appointment";
import { BloodBankModel } from "@/models/blood-bank";

export default async function BankAppointmentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BLOOD_BANK_ADMIN") {
    return <ForbiddenCard message="This page is available to blood bank administrators." />;
  }

  await connectToDatabase();
  const bank = await BloodBankModel.findOne({ adminUserId: user._id }).select("_id");
  if (!bank) {
    return <ForbiddenCard message="Create and verify a bank profile to manage appointments." />;
  }

  const appointments = await AppointmentModel.find({ bankId: bank._id })
    .sort({ scheduledAt: 1 })
    .populate("donorId", "name phone bloodGroup")
    .lean();

  return (
    <AppointmentsTable
      appointments={appointments.map((appointment) => ({
        _id: appointment._id.toString(),
        donorName:
          appointment.donorId && typeof appointment.donorId === "object" ? appointment.donorId.name : "Unknown",
        donorPhone:
          appointment.donorId && typeof appointment.donorId === "object" ? appointment.donorId.phone : "-",
        bloodGroup:
          appointment.donorId && typeof appointment.donorId === "object"
            ? appointment.donorId.bloodGroup ?? "-"
            : "-",
        scheduledAt: appointment.scheduledAt.toISOString(),
        status: appointment.status,
      }))}
    />
  );
}
