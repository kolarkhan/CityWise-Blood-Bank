"use client";

import Image from "next/image";
import { Camera, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/client";
import { detectCityFromCurrentLocation } from "@/lib/geo-client";

type BankProfile = {
  _id?: string;
  name: string;
  city: string;
  licenseNo: string;
  contactPhone: string;
  address: string;
  operatingHours?: string;
  profileImage?: string | null;
  coverImage?: string | null;
  geo?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
};

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_COVER_IMAGE_BYTES = 3 * 1024 * 1024;

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

export function BankProfileForm({ initial }: { initial?: BankProfile | null }) {
  const [loading, setLoading] = useState(false);
  const [detectingCity, setDetectingCity] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    licenseNo: initial?.licenseNo ?? "",
    contactPhone: initial?.contactPhone ?? "",
    address: initial?.address ?? "",
    operatingHours: initial?.operatingHours ?? "",
    profileImage: initial?.profileImage ?? null,
    coverImage: initial?.coverImage ?? null,
    geo: {
      lat: typeof initial?.geo?.lat === "number" ? initial.geo.lat : null,
      lng: typeof initial?.geo?.lng === "number" ? initial.geo.lng : null,
    },
  });

  const onPickImage = async (file: File | null, type: "profileImage" | "coverImage") => {
    if (!file) return;
    const maxBytes = type === "profileImage" ? MAX_PROFILE_IMAGE_BYTES : MAX_COVER_IMAGE_BYTES;
    if (file.size > maxBytes) {
      toast.error(type === "profileImage" ? "Profile image must be <= 2MB" : "Cover image must be <= 3MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, [type]: dataUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image");
    }
  };

  const autoFillCity = async (silent = false) => {
    try {
      setDetectingCity(true);
      const detected = await detectCityFromCurrentLocation();
      setForm((prev) => ({
        ...prev,
        city: detected.city,
        geo: { lat: detected.lat, lng: detected.lng },
      }));
      if (!silent) {
        toast.success(`Location detected: ${detected.city}`);
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

  const save = async () => {
    try {
      setLoading(true);
      const method = initial?._id ? "PATCH" : "POST";
      await fetchJson("/api/banks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          operatingHours: form.operatingHours || undefined,
          profileImage: form.profileImage || undefined,
          coverImage: form.coverImage || undefined,
          geo:
            typeof form.geo.lat === "number" && typeof form.geo.lng === "number"
              ? { lat: form.geo.lat, lng: form.geo.lng }
              : undefined,
        }),
      });
      toast.success(initial?._id ? "Bank profile updated (pending verification)" : "Bank profile submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blood Bank Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          {form.coverImage ? (
            <Image
              src={form.coverImage}
              alt="Blood bank cover"
              width={1200}
              height={280}
              className="h-40 w-full object-cover"
            />
          ) : (
            <div className="h-40 w-full bg-gradient-to-r from-red-100 via-rose-50 to-orange-100" />
          )}
          <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" />
            Cover
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void onPickImage(event.target.files?.[0] ?? null, "coverImage")}
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <div className="space-y-2">
            <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow">
              {form.profileImage ? (
                <Image src={form.profileImage} alt="Blood bank profile" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <Camera className="h-8 w-8" />
                </div>
              )}
            </div>
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              Upload Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void onPickImage(event.target.files?.[0] ?? null, "profileImage")}
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
                Remove Logo
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label="Bank Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
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
            required
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <p className="text-xs text-slate-500">
            {typeof form.geo.lat === "number" && typeof form.geo.lng === "number"
              ? `Location captured: ${form.geo.lat.toFixed(4)}, ${form.geo.lng.toFixed(4)}`
              : "Click Auto Fill City to capture your current map location."}
          </p>
        </div>
        <Field
          id="licenseNo"
          label="License Number"
          value={form.licenseNo}
          onChange={(value) => setForm((prev) => ({ ...prev, licenseNo: value }))}
        />
        <Field
          id="contactPhone"
          label="Contact Phone"
          value={form.contactPhone}
          onChange={(value) => setForm((prev) => ({ ...prev, contactPhone: value }))}
        />
        <Field
          id="address"
          label="Address"
          value={form.address}
          onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
        />
        <Field
          id="operatingHours"
          label="Operating Hours"
          value={form.operatingHours}
          required={false}
          onChange={(value) => setForm((prev) => ({ ...prev, operatingHours: value }))}
        />
          </div>
        </div>

        <div className="md:col-span-2">
          <Button onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
