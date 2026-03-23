const LOCAL_SITE_ORIGIN = "http://localhost:3000";

export function getSiteOrigin() {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return String(configuredOrigin || LOCAL_SITE_ORIGIN).replace(/\/+$/, "");
}

export function buildAbsoluteUrl(path = "/") {
  const normalizedPath = String(path || "/").startsWith("/") ? String(path || "/") : `/${path}`;
  return new URL(normalizedPath, `${getSiteOrigin()}/`).toString();
}
