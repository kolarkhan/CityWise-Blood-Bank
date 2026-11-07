"use client";

import Image from "next/image";
import { Camera, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchJson } from "@/lib/client";
import { BLOOD_GROUPS } from "@/lib/enums";
import { detectCityFromCurrentLocation } from "@/lib/geo-client";

type DonorProfileFormProps = {
  donor: {
    name: string;
    city: string;
    address?: string | null;
    bloodGroup?: string | null;
    cnic?: string | null;
    profileImage?: string | null;
    isAvailable: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    lastDonationDate?: string | Date | null;
    geo?: {
      lat?: number | null;
      lng?: number | null;
    } | null;
  };
  nextEligibleDate?: string | Date | null;
  onboardingRequired?: boolean;
};

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read image"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

export function DonorProfileForm({ donor, nextEligibleDate, onboardingRequired = false }: DonorProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [verifying, setVerifying] = useState<"email" | "phone" | null>(null);
  const [detectingCity, setDetectingCity] = useState(false);
  const [form, setForm] = useState({
    name: donor.name ?? "",
    city: donor.city ?? "",
    address: donor.address ?? "",
    bloodGroup: donor.bloodGroup ?? "A+",
    cnic: donor.cnic ?? "",
    profileImage: donor.profileImage ?? null,
    lastDonationDate: donor.lastDonationDate ? format(new Date(donor.lastDonationDate), "yyyy-MM-dd") : "",
    isAvailable: donor.isAvailable,
  });

  const formattedEligibleDate = useMemo(() => {
    if (!nextEligibleDate) {
      return "Eligible now";
    }
    return format(new Date(nextEligibleDate), "PPP");
  }, [nextEligibleDate]);

  const onPickProfileImage = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Profile image must be <= 2MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, profileImage: dataUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image");
    }
  };

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

  const saveProfile = async () => {
    try {
      setLoading(true);
      await fetchJson("/api/donor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          address: form.address || undefined,
          bloodGroup: form.bloodGroup,
          cnic: form.cnic || undefined,
          profileImage: form.profileImage ?? null,
          lastDonationDate: form.lastDonationDate || undefined,
        }),
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (value: boolean) => {
    try {
      setAvailabilityLoading(true);
      await fetchJson("/api/donor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: value }),
      });
      setForm((prev) => ({ ...prev, isAvailable: value }));
      toast.success(`Availability updated: ${value ? "Available" : "Not Available"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Availability update failed");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const verify = async (type: "email" | "phone") => {
    try {
      setVerifying(type);
      await fetchJson(`/api/auth/verify/send?type=${type}`, { method: "POST" });
      await fetchJson("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code: "123456" }),
      });
      toast.success(`${type} verified`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="space-y-6">
      {onboardingRequired ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-900">Complete your donor profile</p>
            <p className="mt-1 text-sm text-amber-800">
              Please confirm your city and blood group, then save profile to continue donor actions.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Donor Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow">
                {form.profileImage ? (
                  <Image src={form.profileImage} alt="Donor profile" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Camera className="h-7 w-7" />
                  </div>
                )}
              </div>
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Upload Profile Pic
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void onPickProfileImage(event.target.files?.[0] ?? null)}
                />
              </label>
              {form.profileImage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-rose-600"
                  onClick={() => setForm((prev) => ({ ...prev, profileImage: null }))}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field id="name" label="Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
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
              <Field id="address" label="Address" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} required={false} />
              <Field id="cnic" label="CNIC / ID" value={form.cnic} onChange={(value) => setForm((prev) => ({ ...prev, cnic: value }))} required={false} />
              <div className="space-y-1.5">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  id="bloodGroup"
                  value={form.bloodGroup}
                  onChange={(event) => setForm((prev) => ({ ...prev, bloodGroup: event.target.value }))}
                >
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              </div>
              <Field
                id="lastDonationDate"
                type="date"
                label="Last Donation Date"
                value={form.lastDonationDate}
                required={false}
                onChange={(value) => setForm((prev) => ({ ...prev, lastDonationDate: value }))}
              />
            </div>
          </div>

          <div>
            <Button onClick={saveProfile} disabled={loading}>
              {loading ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability & Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Switch
            checked={form.isAvailable}
            onChange={toggleAvailability}
            disabled={availabilityLoading}
            label={form.isAvailable ? "Available for donation" : "Not available"}
          />
          <p className="text-sm text-slate-500">Next eligible date: {formattedEligibleDate}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => verify("email")} disabled={verifying !== null || donor.emailVerified}>
              {donor.emailVerified ? "Email Verified" : verifying === "email" ? "Verifying..." : "Verify Email"}
            </Button>
            <Button variant="outline" onClick={() => verify("phone")} disabled={verifying !== null || donor.phoneVerified}>
              {donor.phoneVerified ? "Phone Verified" : verifying === "phone" ? "Verifying..." : "Verify Phone"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
