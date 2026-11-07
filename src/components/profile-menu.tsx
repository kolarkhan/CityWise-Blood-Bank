"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileMenuProps = {
  name: string;
  city?: string | null;
  dashboardPath?: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return (parts[0][0] ?? "U").toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProfileMenu({ name, city, dashboardPath }: ProfileMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
      toast.success("Logged out");
      router.push("/auth/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Open profile menu"
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 text-slate-700 transition hover:bg-slate-50",
          open && "bg-red-50 text-red-700",
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
          {getInitials(name)}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <div className="rounded-md bg-slate-50 p-2">
            <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
            <p className="truncate text-xs text-slate-500">{city ?? "City not set"}</p>
          </div>

          {dashboardPath ? (
            <Link href={dashboardPath} className="mt-2 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <UserCircle2 className="h-4 w-4" />
              Dashboard
            </Link>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full justify-start gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
            {loading ? "Logging out..." : "Logout"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
