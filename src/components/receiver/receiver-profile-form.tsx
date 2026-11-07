"use client";

import Image from "next/image";
import { Camera, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";

type ReceiverProfile = {
  name: string;
  city: string;
  phone: string;
  email: string;
  profileImage?: string | null;
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

export function ReceiverProfileForm({ initial }: { initial: ReceiverProfile }) {
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(initial.profileImage ?? null);

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Profile image must be <= 2MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileImage(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image");
    }
  };

  const save = async () => {
    try {
      setLoading(true);
      await fetchJson("/api/receiver/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileImage: profileImage ?? null,
        }),
      });
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile picture");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Receiver Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow">
            {profileImage ? (
              <Image src={profileImage} alt="Receiver profile" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <Camera className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">{initial.name}</p>
            <p className="text-xs text-slate-600">{initial.city}</p>
            <p className="text-xs text-slate-500">{initial.email}</p>
            <p className="text-xs text-slate-500">{initial.phone}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" />
            Upload Profile Pic
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void onPickImage(event.target.files?.[0] ?? null)}
            />
          </label>
          {profileImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600"
              onClick={() => setProfileImage(null)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        <Button onClick={save} disabled={loading}>
          {loading ? "Saving..." : "Save Profile Picture"}
        </Button>
      </CardContent>
    </Card>
  );
}
