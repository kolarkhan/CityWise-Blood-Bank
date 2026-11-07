"use client";

import Image from "next/image";
import { Camera, MapPin, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/client";
import { detectCityFromCurrentLocation } from "@/lib/geo-client";

type HospitalProfile = {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
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

export function HospitalProfileForm({ initial }: { initial: HospitalProfile }) {
  const [loading, setLoading] = useState(false);
  const [detectingCity, setDetectingCity] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    city: initial.city,
    address: initial.address ?? "",
    profileImage: initial.profileImage ?? null,
    coverImage: initial.coverImage ?? null,
    geo: {
      lat: typeof initial.geo?.lat === "number" ? initial.geo.lat : null,
      lng: typeof initial.geo?.lng === "number" ? initial.geo.lng : null,
    },
  });

  const locationHint = useMemo(() => {
    if (typeof form.geo.lat === "number" && typeof form.geo.lng === "number") {
      return `${form.geo.lat.toFixed(4)}, ${form.geo.lng.toFixed(4)}`;
    }
    return "Location not set";
  }, [form.geo.lat, form.geo.lng]);

  const autoFillCity = async () => {
    try {
      setDetectingCity(true);
      const detected = await detectCityFromCurrentLocation();
      setForm((prev) => ({
        ...prev,
        city: detected.city,
        geo: { lat: detected.lat, lng: detected.lng },
      }));
      toast.success(`Location detected: ${detected.city}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to detect location");
    } finally {
      setDetectingCity(false);
    }
  };

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

  const save = async () => {
    try {
      setLoading(true);
      await fetchJson("/api/hospital/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          address: form.address || undefined,
          profileImage: form.profileImage || undefined,
          coverImage: form.coverImage || undefined,
          geo:
            typeof form.geo.lat === "number" && typeof form.geo.lng === "number"
              ? { lat: form.geo.lat, lng: form.geo.lng }
              : undefined,
        }),
      });
      toast.success("Hospital profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hospital Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative overflow-hidden rounded-xl border border-slate-200">
            {form.coverImage ? (
              <Image
                src={form.coverImage}
                alt="Hospital cover"
                width={1200}
                height={300}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="h-44 w-full bg-gradient-to-r from-red-100 via-rose-50 to-orange-100" />
            )}

            <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-xs text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-red-700" />
              {form.city || "City not set"}
            </div>

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
                  <Image src={form.profileImage} alt="Hospital profile" fill className="object-cover" />
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
              <Field
                id="name"
                label="Hospital Name"
                value={form.name}
                onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
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
                    {detectingCity ? "Detecting..." : "Auto Fill"}
                  </Button>
                </div>
                <Input
                  id="city"
                  value={form.city}
                  required
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
                <p className="text-xs text-slate-500">Geo: {locationHint}</p>
              </div>

              <Field id="phone" label="Contact Phone" value={initial.phone} onChange={() => {}} readOnly />
              <Field id="email" label="Email" value={initial.email} onChange={() => {}} readOnly />

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
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
  readOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} />
    </div>
  );
}
