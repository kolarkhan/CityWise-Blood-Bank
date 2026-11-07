import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function getRequestClientKey(request: NextRequest) {
  const directIp =
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ??
    firstHeaderValue(request.headers.get("x-vercel-forwarded-for"));

  if (directIp) {
    return directIp;
  }

  // Local/dev fallback where IP headers may be unavailable.
  const ua = request.headers.get("user-agent") ?? "unknown-ua";
  const lang = request.headers.get("accept-language") ?? "unknown-lang";
  return `unknown:${ua.slice(0, 80)}:${lang.slice(0, 40)}`;
}
