import { redirect } from "next/navigation";
import type React from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/enums";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <DashboardShell
      userId={user._id.toString()}
      role={user.role as UserRole}
      name={user.name}
      city={user.city}
    >
      {children}
    </DashboardShell>
  );
}
