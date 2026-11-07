import { Types } from "mongoose";
import { NextRequest } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import { UserModel } from "@/models/user";

export type RequestUser = {
  _id: Types.ObjectId;
  role: UserRole;
  city?: string;
  email: string;
  name: string;
  isBlocked: boolean;
};

export async function requireAuth(request: NextRequest, allowedRoles?: UserRole[]) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return { error: "Unauthorized" as const };
  }

  await connectToDatabase();
  const user = await UserModel.findById(auth.userId)
    .select("_id role city email name isBlocked")
    .lean<RequestUser | null>();

  if (!user || user.isBlocked) {
    return { error: "Unauthorized" as const };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: "Forbidden" as const };
  }

  return { user };
}

export function canAccessRole(targetRole: UserRole, actorRole: UserRole) {
  if (actorRole === "SUPER_ADMIN") {
    return true;
  }
  if (actorRole === "CITY_ADMIN") {
    return !["SUPER_ADMIN", "CITY_ADMIN"].includes(targetRole);
  }
  return false;
}
