"use client";

import type React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { detectCityFromCurrentLocation } from "@/lib/geo-client";
import { BLOOD_GROUPS, REQUEST_URGENCY } from "@/lib/enums";
import { fetchJson } from "@/lib/client";

export function RequestCreateForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [detectingCity, setDetectingCity] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    hospitalName: "",
    bloodGroup: "A+" as (typeof BLOOD_GROUPS)[number],
    units: "1",
    city: "",
    urgency: "NORMAL" as (typeof REQUEST_URGENCY)[number],
    contactPhone: "",
    neededByDate: "",
  });

  const autoFillCity = async (silent = false) => {
    try {
      setDetectingCity(true);
      const detected = await detectCityFromCurrentLocation();
      setForm((prev) => ({ ...prev, city: detected.city }));
      if (!silent) {
        toast.success(`City detected: ${detected.city}`);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Unable to detect city");
      }
    } finally {
      setDetectingCity(false);
    }
  };

  useEffect(() => {
    if (!form.city) {
      void autoFillCity(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      await fetchJson("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          units: Number(form.units),
          hospitalName: form.hospitalName || undefined,
        }),
      });
      toast.success("Request created successfully");
      setForm({
        patientName: "",
        hospitalName: "",
        bloodGroup: "A+",
        units: "1",
        city: "",
        urgency: "NORMAL",
        contactPhone: "",
        neededByDate: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      if (message.toLowerCase().includes("unauthorized")) {
        toast.error("Please login as receiver/hospital to create a request.");
        router.push(`/auth/login?next=${encodeURIComponent(pathname || "/")}`);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Blood Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field
            id="patientName"
            label="Patient Name"
            value={form.patientName}
            onChange={(value) => setForm((prev) => ({ ...prev, patientName: value }))}
          />
          <Field
            id="hospitalName"
            label="Hospital (Optional)"
            value={form.hospitalName}
            required={false}
            onChange={(value) => setForm((prev) => ({ ...prev, hospitalName: value }))}
          />
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
          <Field
            id="units"
            label="Units"
            type="number"
            value={form.units}
            onChange={(value) => setForm((prev) => ({ ...prev, units: value }))}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="city">City</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={autoFillCity}
                disabled={detectingCity}
              >
                {detectingCity ? "Detecting..." : "Auto Fill City"}
              </Button>
            </div>
            <Input
              id="city"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="urgency">Urgency</Label>
            <Select
              id="urgency"
              value={form.urgency}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, urgency: event.target.value as (typeof REQUEST_URGENCY)[number] }))
              }
            >
              {REQUEST_URGENCY.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {urgency}
                </option>
              ))}
            </Select>
          </div>
          <Field
            id="contactPhone"
            label="Contact Phone"
            value={form.contactPhone}
            onChange={(value) => setForm((prev) => ({ ...prev, contactPhone: value }))}
          />
          <Field
            id="neededByDate"
            type="date"
            label="Needed By Date"
            value={form.neededByDate}
            onChange={(value) => setForm((prev) => ({ ...prev, neededByDate: value }))}
          />

          <div className="md:col-span-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
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
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
