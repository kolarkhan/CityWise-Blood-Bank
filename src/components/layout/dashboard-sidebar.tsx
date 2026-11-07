import Link from "next/link";
import { Droplets, Factory, HeartHandshake, Home, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import type React from "react";

import { AppLogo } from "@/components/app-logo";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/enums";

type SidebarProps = {
  role: UserRole;
  pathname: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navByRole: Record<UserRole, NavItem[]> = {
  DONOR: [
    { href: "/dashboard/donor", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/donor/profile", label: "Profile", icon: Users },
    { href: "/dashboard/donor/requests", label: "Requests", icon: HeartHandshake },
    { href: "/dashboard/donor/history", label: "History", icon: Droplets },
  ],
  RECEIVER: [
    { href: "/dashboard/receiver", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/receiver/profile", label: "Profile", icon: Users },
    { href: "/dashboard/receiver/requests", label: "My Requests", icon: HeartHandshake },
  ],
  HOSPITAL: [
    { href: "/dashboard/receiver", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/receiver/profile", label: "Hospital Profile", icon: Factory },
    { href: "/dashboard/receiver/requests", label: "My Requests", icon: HeartHandshake },
  ],
  BLOOD_BANK_ADMIN: [
    { href: "/dashboard/bank", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/bank/profile", label: "Bank Profile", icon: Factory },
    { href: "/dashboard/bank/inventory", label: "Inventory", icon: Droplets },
    { href: "/dashboard/bank/appointments", label: "Appointments", icon: HeartHandshake },
  ],
  CITY_ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/banks", label: "Blood Banks", icon: Factory },
    { href: "/dashboard/admin/requests", label: "Requests", icon: HeartHandshake },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: ShieldCheck },
  ],
  SUPER_ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/banks", label: "Blood Banks", icon: Factory },
    { href: "/dashboard/admin/requests", label: "Requests", icon: HeartHandshake },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: ShieldCheck },
  ],
};

export function DashboardSidebar({ role, pathname }: SidebarProps) {
  const items = navByRole[role];

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
      <AppLogo />
      <nav className="mt-8 flex flex-1 flex-col gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-transform duration-200 will-change-transform hover:scale-[1.03] hover:bg-slate-100"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>

        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-transform duration-200 will-change-transform hover:scale-[1.03]",
                active ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
