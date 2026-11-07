import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { verifyAuthToken } from "@/lib/auth";
import { dashboardAccessRules, getDefaultDashboardPath } from "@/lib/routes";

async function isAuthorizedPath(pathname: string, role: string) {
  const matchedRule = dashboardAccessRules.find((rule) => pathname.startsWith(rule.pathPrefix));
  if (!matchedRule) {
    return true;
  }
  return matchedRule.roles.includes(role as (typeof matchedRule.roles)[number]);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (pathname.startsWith("/auth/")) {
    if (!token) {
      return NextResponse.next();
    }
    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(getDefaultDashboardPath(payload.role), request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const authorized = await isAuthorizedPath(pathname, payload.role);
    if (!authorized) {
      return NextResponse.redirect(new URL(getDefaultDashboardPath(payload.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*", "/dashboard/:path*"],
};
