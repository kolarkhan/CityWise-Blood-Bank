import { z } from "zod";
import { NextRequest } from "next/server";

import { getEnv } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestClientKey } from "@/lib/request-client";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type GeocodeAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GeocodeResult = {
  formatted_address: string;
  address_components: GeocodeAddressComponent[];
};

type GeocodeResponse = {
  status: string;
  results: GeocodeResult[];
  error_message?: string;
};

const cityTypePriority = [
  "locality",
  "postal_town",
  "administrative_area_level_2",
  "administrative_area_level_1",
  "sublocality_level_1",
  "sublocality",
  "neighborhood",
] as const;

function pickCity(components: GeocodeAddressComponent[]) {
  for (const type of cityTypePriority) {
    const item = components.find((component) => component.types.includes(type));
    if (item?.long_name) {
      return item.long_name;
    }
  }

  return null;
}

function pickCityFromResults(results: GeocodeResult[]) {
  for (const type of cityTypePriority) {
    for (const result of results) {
      const match = result.address_components.find((component) => component.types.includes(type));
      if (match?.long_name) {
        return match.long_name;
      }
    }
  }

  return null;
}

function fallbackFromFormattedAddress(formattedAddress: string) {
  const parts = formattedAddress
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  // Skip postal/house-number-like fragments and pick the first human-readable area token.
  const readable = parts.find((part) => /[A-Za-z]/.test(part) && !/^\d/.test(part));
  return readable ?? parts[0] ?? null;
}

export async function GET(request: NextRequest) {
  const ip = getRequestClientKey(request);
  const limiter = rateLimit(`location:city:${ip}`, 40, 10 * 60 * 1000);
  if (!limiter.success) {
    return fail("Too many location requests. Try again later.", 429);
  }

  const parsed = querySchema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng"),
  });

  if (!parsed.success) {
    return fail("Validation failed", 422, { issues: parsed.error.flatten() });
  }

  const env = getEnv();
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return fail("Google Maps API key is not configured", 500);
  }

  const { lat, lng } = parsed.data;
  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    return fail("Unable to resolve city for coordinates", 502);
  }

  const data = (await response.json()) as GeocodeResponse;
  if (data.status !== "OK" || !data.results?.length) {
    if (data.status === "REQUEST_DENIED") {
      return fail(
        "Google Geocoding denied this request. Use GOOGLE_MAPS_API_KEY with Geocoding API enabled and without referer-only restrictions.",
        502,
        { providerStatus: data.status, providerMessage: data.error_message },
      );
    }
    if (data.status === "ZERO_RESULTS") {
      return fail("City could not be identified for this location", 422, {
        providerStatus: data.status,
      });
    }
    return fail("City lookup failed", 502, {
      providerStatus: data.status,
      providerMessage: data.error_message,
    });
  }

  const city =
    pickCityFromResults(data.results) ??
    pickCity(data.results[0].address_components) ??
    fallbackFromFormattedAddress(data.results[0].formatted_address);
  if (!city) {
    return fail("City could not be identified for this location", 422);
  }

  return ok({
    city,
    lat,
    lng,
    formattedAddress: data.results[0].formatted_address,
  });
}
