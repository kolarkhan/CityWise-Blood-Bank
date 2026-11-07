"use client";

import { Menu } from "lucide-react";

import { TopbarCommunication } from "@/components/layout/topbar-communication";
import { ProfileMenu } from "@/components/profile-menu";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/enums";

type DashboardTopbarProps = {
  user: {
    id: string;
    name: string;
    role: UserRole;
    city?: string | null;
  };
};

export function DashboardTopbar({ user }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="inline-flex items-center gap-3">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 lg:hidden"
            aria-label="Open navigation"
            type="button"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm text-slate-500">Current role</p>
            <Badge variant="info">{user.role}</Badge>
          </div>
        </div>

        <div className="inline-flex items-center gap-3">
          <div className="mr-1 border-r border-slate-200 pr-3">
            <TopbarCommunication currentUserId={user.id} />
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.city ?? "City not set"}</p>
          </div>
          <ProfileMenu name={user.name} city={user.city} />
        </div>
      </div>
    </header>
  );
}
