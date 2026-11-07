import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestClientKey } from "@/lib/request-client";
import { UserModel } from "@/models/user";

const syncLocationSchema = z.object({
  city: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const ip = getRequestClientKey(request);
  const limiter = rateLimit(`location:sync:${ip}:${auth.user._id.toString()}`, 30, 10 * 60 * 1000);
  if (!limiter.success) {
    return fail("Too many location sync requests. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = syncLocationSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();
  const { city, lat, lng } = parsed.data;

  await UserModel.updateOne(
    { _id: auth.user._id },
    {
      $set: {
        city,
        geo: { lat, lng },
      },
    },
  );

  return ok({ city, geo: { lat, lng } });
}
