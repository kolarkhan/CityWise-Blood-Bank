type DetectedCity = {
  city: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
};

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
    });
  });
}

export async function detectCityFromCurrentLocation(): Promise<DetectedCity> {
  const position = await getCurrentPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const response = await fetch(`/api/location/city?lat=${lat}&lng=${lng}`);
  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.error ?? "Unable to detect city");
  }

  const data = body.data as DetectedCity;
  if (!data?.city) {
    throw new Error("Unable to detect city");
  }

  return data;
}

export async function syncSignedInUserLocationFromDevice() {
  const detected = await detectCityFromCurrentLocation();
  const response = await fetch("/api/location/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      city: detected.city,
      lat: detected.lat,
      lng: detected.lng,
    }),
    keepalive: true,
  });

  if (!response.ok) {
    let message = "Unable to sync location";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON response body
    }
    throw new Error(message);
  }

  return detected;
}
