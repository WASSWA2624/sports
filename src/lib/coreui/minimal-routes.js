export function buildMatchBoardHref(locale, filters = {}, forced = {}) {
  const params = new URLSearchParams();
  const merged = { ...filters, ...forced };

  for (const [key, value] of Object.entries(merged)) {
    if (!value || value === "all" || value === "ALL") {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}
