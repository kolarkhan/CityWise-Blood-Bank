"use client";

import { usePathname } from "next/navigation";
import type React from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { UserRole } from "@/lib/enums";

type DashboardShellProps = {
  userId: string;
  role: UserRole;
  name: string;
  city?: string | null;
  children: React.ReactNode;
};

export function DashboardShell({ userId, role, name, city, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <DashboardSidebar role={role} pathname={pathname} />
        <div className="min-h-screen flex-1">
          <DashboardTopbar user={{ id: userId, role, name, city }} />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
