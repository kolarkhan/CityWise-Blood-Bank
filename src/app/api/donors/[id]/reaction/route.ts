import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { getRequestClientKey } from "@/lib/request-client";
import { rateLimit } from "@/lib/rate-limit";
import { DonorReactionModel } from "@/models/donor-reaction";
import { UserModel } from "@/models/user";
import { donorReactionSchema } from "@/schemas/reaction";

type Context = {
  params: Promise<{ id: string }>;
};

async function getCounts(donorObjectId: Types.ObjectId) {
  const [row] = await DonorReactionModel.aggregate<{ likes: number; dislikes: number }>([
    { $match: { donorId: donorObjectId } },
    {
      $group: {
        _id: "$donorId",
        likes: { $sum: { $cond: [{ $eq: ["$reaction", 1] }, 1, 0] } },
        dislikes: { $sum: { $cond: [{ $eq: ["$reaction", -1] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, likes: 1, dislikes: 1 } },
  ]);

  return { likes: row?.likes ?? 0, dislikes: row?.dislikes ?? 0 };
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const limiter = rateLimit(
    `donor:reaction:${auth.user._id.toString()}:${getRequestClientKey(request)}`,
    120,
    60_000,
  );
  if (!limiter.success) {
    return fail("Too many reaction attempts. Try again shortly.", 429);
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return fail("Invalid donor id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload", 400);
  }

  const parsed = donorReactionSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  await connectToDatabase();

  const donorObjectId = new Types.ObjectId(id);
  const donor = await UserModel.findOne({ _id: donorObjectId, role: "DONOR", isBlocked: false })
    .select("_id")
    .lean();
  if (!donor) {
    return fail("Donor not found", 404);
  }

  const existing = await DonorReactionModel.findOne({
    donorId: donorObjectId,
    userId: auth.user._id,
  }).lean();

  let finalReaction: 1 | -1 | 0 = parsed.data.reaction;

  if (existing?.reaction === parsed.data.reaction) {
    await DonorReactionModel.deleteOne({ _id: existing._id });
    finalReaction = 0;
  } else if (existing) {
    await DonorReactionModel.updateOne(
      { _id: existing._id },
      { $set: { reaction: parsed.data.reaction } },
    );
  } else {
    await DonorReactionModel.create({
      donorId: donorObjectId,
      userId: auth.user._id,
      reaction: parsed.data.reaction,
    });
  }

  const counts = await getCounts(donorObjectId);

  return ok({
    donorId: donorObjectId.toString(),
    reaction: finalReaction,
    likes: counts.likes,
    dislikes: counts.dislikes,
  });
}

