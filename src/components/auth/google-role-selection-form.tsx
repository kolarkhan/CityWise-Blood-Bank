"use client";

import Link from "next/link";
import { Building2, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/lib/enums";
import { syncSignedInUserLocationFromDevice } from "@/lib/geo-client";
import { GOOGLE_PENDING_SIGNIN_KEY, GOOGLE_ROLE_OPTIONS, type GoogleRole, type PendingGoogleSignin } from "@/lib/google-auth";
import { getDefaultDashboardPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

type GoogleAuthSuccessResponse = {
  success: true;
  data: {
    user: {
      role: UserRole;
    };
    onboardingPath?: string | null;
  };
};

type GoogleAuthErrorResponse = {
  success: false;
  error: string;
};

const roleCards: Record<
  GoogleRole,
  {
    title: string;
    subtitle: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  DONOR: {
    title: "Donor",
    subtitle: "Help patients directly by accepting matched blood requests.",
    icon: HeartPulse,
  },
  RECEIVER: {
    title: "Receiver",
    subtitle: "Search blood quickly and raise requests for patients.",
    icon: Users,
  },
  HOSPITAL: {
    title: "Hospital",
    subtitle: "Manage patient requests with hospital-level coordination.",
    icon: Building2,
  },
  BLOOD_BANK_ADMIN: {
    title: "Blood Bank Admin",
    subtitle: "Handle inventory, appointments, and blood bank profile.",
    icon: ShieldCheck,
  },
};

function parsePending(raw: string | null): PendingGoogleSignin | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingGoogleSignin>;
    if (!parsed.idToken || typeof parsed.idToken !== "string") {
      return null;
    }
    const options = Array.isArray(parsed.roleOptions)
      ? parsed.roleOptions.filter((item): item is GoogleRole => GOOGLE_ROLE_OPTIONS.includes(item as GoogleRole))
      : [];
    return {
      idToken: parsed.idToken,
      roleOptions: options.length ? options : [...GOOGLE_ROLE_OPTIONS],
      next: parsed.next && parsed.next.startsWith("/") ? parsed.next : null,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function GoogleRoleSelectionForm() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingGoogleSignin | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<GoogleRole>("RECEIVER");

  useEffect(() => {
    const data = parsePending(sessionStorage.getItem(GOOGLE_PENDING_SIGNIN_KEY));
    setPending(data);
    if (data?.roleOptions?.length) {
      setSelectedRole(data.roleOptions[0]);
    }
    setLoading(false);
  }, []);

  const availableRoles = useMemo(() => pending?.roleOptions ?? [...GOOGLE_ROLE_OPTIONS], [pending]);

  const finalizeLogin = async (role: UserRole, next: string | null, onboardingPath?: string | null) => {
    try {
      await syncSignedInUserLocationFromDevice();
    } catch {
      // Do not block auth flow due to location permissions.
    }
    const safeOnboardingPath =
      onboardingPath && onboardingPath.startsWith("/dashboard/donor/profile") ? onboardingPath : null;
    router.push(safeOnboardingPath ?? (next && next.startsWith("/") ? next : null) ?? getDefaultDashboardPath(role));
    router.refresh();
  };

  const continueWithRole = async () => {
    if (!pending) return;
    try {
      setSubmitting(true);
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: pending.idToken, role: selectedRole }),
      });
      const body = (await response.json()) as GoogleAuthSuccessResponse | GoogleAuthErrorResponse;
      if (!response.ok || body.success === false) {
        throw new Error(body && "error" in body ? body.error : "Unable to complete sign-in");
      }

      sessionStorage.removeItem(GOOGLE_PENDING_SIGNIN_KEY);
      toast.success("Google sign-in completed");
      await finalizeLogin(body.data.user.role, pending.next, body.data.onboardingPath ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete sign-in");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-3xl">
        <CardContent className="p-8 text-center text-sm text-slate-600">Preparing role selection...</CardContent>
      </Card>
    );
  }

  if (!pending) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Google Session Not Found</CardTitle>
          <CardDescription>Start Google sign-in again from the login page to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button>Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Select Account Type</CardTitle>
        <CardDescription>Choose how you want to use CityWise with your Google account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {availableRoles.map((role) => {
            const details = roleCards[role];
            const Icon = details.icon;
            const active = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "rounded-xl border p-5 text-left transition",
                  active
                    ? "border-red-500 bg-red-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/30",
                )}
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-base font-semibold text-slate-900">{details.title}</p>
                <p className="mt-1 text-sm text-slate-600">{details.subtitle}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Link href="/auth/login">
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button onClick={continueWithRole} disabled={submitting}>
            {submitting ? "Continuing..." : `Continue as ${selectedRole}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
