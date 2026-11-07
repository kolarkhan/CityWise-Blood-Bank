import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  return ok({ user: auth.user });
}
