import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/authorization";
import { fail, ok } from "@/lib/http";
import { messageProvider } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) {
    return fail(auth.error, auth.error === "Unauthorized" ? 401 : 403);
  }

  const type = request.nextUrl.searchParams.get("type");
  if (!type || !["email", "phone"].includes(type)) {
    return fail("type must be email or phone", 422);
  }

  await messageProvider.send({
    to: type === "email" ? auth.user.email : auth.user.phone,
    subject: `CityWise ${type} verification`,
    body: "Your demo verification code is 123456",
  });

  return ok({ sent: true, codeHint: "123456" });
}
