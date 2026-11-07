import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { UserModel } from "@/models/user";
import { hospitalProfileUpdateSchema } from "@/schemas/hospital";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["HOSPITAL"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  await connectToDatabase();
  const user = await UserModel.findById(auth.user._id)
    .select("name city address phone email profileImage coverImage geo")
    .lean();
  if (!user) {
    return fail("Hospital profile not found", 404);
  }

  return ok({
    profile: {
      name: user.name,
      city: user.city,
      address: user.address ?? "",
      phone: user.phone,
      email: user.email,
      profileImage: user.profileImage ?? null,
      coverImage: user.coverImage ?? null,
      geo: user.geo
        ? {
            lat: typeof user.geo.lat === "number" ? user.geo.lat : null,
            lng: typeof user.geo.lng === "number" ? user.geo.lng : null,
          }
        : null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ["HOSPITAL"]);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = hospitalProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const update = parsed.data;
  const user = await UserModel.findByIdAndUpdate(
    auth.user._id,
    {
      $set: {
        name: update.name,
        city: update.city,
        address: update.address ?? null,
        profileImage: update.profileImage ?? null,
        coverImage: update.coverImage ?? null,
        geo: update.geo ?? { lat: null, lng: null },
      },
    },
    { new: true },
  )
    .select("name city address phone email profileImage coverImage geo")
    .lean();

  if (!user) {
    return fail("Hospital profile not found", 404);
  }

  return ok({
    profile: {
      name: user.name,
      city: user.city,
      address: user.address ?? "",
      phone: user.phone,
      email: user.email,
      profileImage: user.profileImage ?? null,
      coverImage: user.coverImage ?? null,
      geo: user.geo
        ? {
            lat: typeof user.geo.lat === "number" ? user.geo.lat : null,
            lng: typeof user.geo.lng === "number" ? user.geo.lng : null,
          }
        : null,
    },
  });
}
