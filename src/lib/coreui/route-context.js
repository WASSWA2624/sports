export const GEO_QUERY_PARAM = "geo";
export const GEO_COOKIE_NAME = "sports_geo";
export const REQUEST_ID_HEADER = "x-request-id";
export const VIEWER_GEO_HEADER = "x-sports-geo";
export const DEFAULT_MARKET_GEO = "INTL";
export const LAUNCH_MARKET_GEOS = Object.freeze(["UG", "KE", "NG"]);
export const SUPPORTED_MARKET_GEOS = Object.freeze([
  ...LAUNCH_MARKET_GEOS,
  DEFAULT_MARKET_GEO,
]);
export const GEO_LABELS = Object.freeze({
  UG: "Uganda",
  KE: "Kenya",
  NG: "Nigeria",
  INTL: "International",
});

function normalizeGeoCandidate(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  if (["GLOBAL", "WORLD", "INTERNATIONAL"].includes(normalized)) {
    return DEFAULT_MARKET_GEO;
  }

  return normalized;
}

export function normalizeGeo(value, fallback = DEFAULT_MARKET_GEO) {
  const normalized = normalizeGeoCandidate(value);

  if (!normalized) {
    return fallback;
  }

  return SUPPORTED_MARKET_GEOS.includes(normalized) ? normalized : DEFAULT_MARKET_GEO;
}

export function getGeoLabel(value) {
  const normalized = normalizeGeo(value);
  return GEO_LABELS[normalized] || normalized;
}

export function parseGeoCsv(value, fallback = []) {
  const parsed = String(value || "")
    .split(",")
    .map((entry) => normalizeGeoCandidate(entry))
    .filter(Boolean)
    .map((entry) =>
      SUPPORTED_MARKET_GEOS.includes(entry) ? entry : DEFAULT_MARKET_GEO
    );

  const unique = [...new Set(parsed)];
  return unique.length ? unique : [...fallback];
}

export function isGeoAllowed(geo, allowedGeos = []) {
  const normalizedGeo = normalizeGeo(geo);
  const normalizedAllowed = [...new Set(
    (allowedGeos || [])
      .map((entry) => normalizeGeoCandidate(entry))
      .filter(Boolean)
      .map((entry) =>
        SUPPORTED_MARKET_GEOS.includes(entry) ? entry : DEFAULT_MARKET_GEO
      )
  )];

  if (!normalizedAllowed.length) {
    return true;
  }

  if (normalizedAllowed.includes(DEFAULT_MARKET_GEO)) {
    return true;
  }

  return normalizedAllowed.includes(normalizedGeo);
}

export function appendRouteContext(href, { geo } = {}) {
  const normalizedHref = String(href || "/");
  const normalizedGeo = geo ? normalizeGeo(geo) : null;

  if (!normalizedGeo) {
    return normalizedHref;
  }

  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedHref);
  const url = isAbsolute
    ? new URL(normalizedHref)
    : new URL(normalizedHref, "https://sports.local");

  url.searchParams.set(GEO_QUERY_PARAM, normalizedGeo);

  if (isAbsolute) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
