"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { detectCityFromCurrentLocation, syncSignedInUserLocationFromDevice } from "@/lib/geo-client";
import { BLOOD_GROUPS, UserRole } from "@/lib/enums";
import { getDefaultDashboardPath } from "@/lib/routes";

const ROLE_OPTIONS: UserRole[] = ["DONOR", "RECEIVER", "HOSPITAL", "BLOOD_BANK_ADMIN"];

type RegisterSuccessResponse = {
  success: true;
  data: {
    user: {
      role: UserRole;
    };
  };
};

type RegisterErrorResponse = {
  success: false;
  error?: string;
  issues?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
};

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("DONOR");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    bloodGroup: "A+" as (typeof BLOOD_GROUPS)[number],
    address: "",
    cnic: "",
    lastDonationDate: "",
  });

  const requiresBloodGroup = role === "DONOR";

  const detectCitySilently = async () => {
    try {
      const detected = await detectCityFromCurrentLocation();
      setForm((prev) => ({ ...prev, city: detected.city }));
    } catch {
      // Keep empty if location cannot be detected.
    }
  };

  useEffect(() => {
    if (!form.city) {
      void detectCitySilently();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo(
    () => ({
      ...form,
      role,
      bloodGroup: requiresBloodGroup ? form.bloodGroup : undefined,
      cnic: form.cnic || undefined,
      address: form.address || undefined,
      lastDonationDate: form.lastDonationDate || undefined,
    }),
    [form, role, requiresBloodGroup],
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      let resolvedCity = form.city;
      if (!resolvedCity) {
        const detected = await detectCityFromCurrentLocation();
        resolvedCity = detected.city;
        setForm((prev) => ({ ...prev, city: detected.city }));
      }
      if (!resolvedCity || resolvedCity.trim().length < 2) {
        throw new Error("City detection failed. Allow location access and try again.");
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, city: resolvedCity }),
      });
      const body = (await response.json()) as RegisterSuccessResponse | RegisterErrorResponse;
      if (!response.ok || body.success === false) {
        const defaultMessage = body && "error" in body && body.error ? body.error : "Registration failed";
        const fieldMessages =
          body && "issues" in body && body.issues?.fieldErrors
            ? Object.entries(body.issues.fieldErrors)
                .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
                .filter(Boolean)
            : [];
        throw new Error(fieldMessages[0] ?? defaultMessage);
      }

      try {
        await syncSignedInUserLocationFromDevice();
      } catch {
        // Registration should still succeed even when location sync fails.
      }
      toast.success("Registration successful");
      router.push(getDefaultDashboardPath(body.data.user.role));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Register as donor, receiver, hospital, or blood bank admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <Field
            id="name"
            label="Full Name"
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />
          <Field
            id="email"
            type="email"
            label="Email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />
          <Field
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          />
          <Field
            id="password"
            type="password"
            label="Password"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="city">City (Auto-detected)</Label>
            <Input
              id="city"
              value={form.city}
              readOnly
              className="bg-slate-50"
              required
            />
            <p className="text-xs text-slate-500">City is detected automatically from your current location.</p>
          </div>
          <Field
            id="address"
            label="Address / Area"
            value={form.address}
            onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
          />
          <Field
            id="cnic"
            label="CNIC / ID (Optional)"
            value={form.cnic}
            onChange={(value) => setForm((prev) => ({ ...prev, cnic: value }))}
          />

          {requiresBloodGroup ? (
            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                id="bloodGroup"
                value={form.bloodGroup}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bloodGroup: event.target.value as (typeof BLOOD_GROUPS)[number] }))
                }
              >
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {requiresBloodGroup ? (
            <Field
              id="lastDonationDate"
              type="date"
              label="Last Donation Date (Optional)"
              value={form.lastDonationDate}
              onChange={(value) => setForm((prev) => ({ ...prev, lastDonationDate: value }))}
            />
          ) : null}

          <div className="md:col-span-2">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-red-600 hover:underline">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={id !== "cnic" && id !== "address" && id !== "lastDonationDate"} />
    </div>
  );
}
