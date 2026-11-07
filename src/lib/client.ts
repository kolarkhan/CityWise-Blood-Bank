export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.error ?? "Request failed");
  }

  return body.data ?? body;
}
