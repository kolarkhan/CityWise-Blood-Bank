import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "@/lib/constants";

export function parsePagination(searchParams: URLSearchParams) {
  const pageRaw = Number(searchParams.get("page") ?? DEFAULT_PAGE);
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? DEFAULT_PAGE : pageRaw;
  const limit =
    Number.isNaN(limitRaw) || limitRaw < 1 ? DEFAULT_LIMIT : Math.min(limitRaw, MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
}
