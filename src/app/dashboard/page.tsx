import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDefaultDashboardPath } from "@/lib/routes";

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  redirect(getDefaultDashboardPath(user.role));
}
