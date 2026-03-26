export function buildMatchBoardHref(locale, filters = {}, forced = {}) {
  const params = new URLSearchParams();
  const merged = { ...filters, ...forced };

  for (const [key, value] of Object.entries(merged)) {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if (!normalizedValue || normalizedValue === "all" || normalizedValue === "ALL") {
      continue;
    }

    if (key === "preset" && normalizedValue === "today") {
      continue;
    }

    params.set(key, String(normalizedValue));
  }

  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}
