const DEFAULT_REMOTE_HOSTS = [
  "images.ctfassets.net",
  "cdn.sportmonks.com",
  "assets.sportsmonks.com",
  "example.com",
];

function normalizeProviderCode(value, fallback = "SPORTSMONKS") {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function readFirstString(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((entry) => normalizeRemoteHost(entry))
    .filter(Boolean);
}

function normalizeRemoteHost(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).hostname;
  } catch (error) {
    return normalized.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

function pickFallback(type) {
  switch (type) {
    case "team-logo":
    case "competition-logo":
      return "/globe.svg";
    case "article-image":
      return "/window.svg";
    default:
      return "/favicon.ico";
  }
}

export function getAssetDeliveryConfig() {
  const providerCode = normalizeProviderCode(process.env.SPORTS_DATA_PROVIDER);
  const remoteHosts = parseCsv(
    readFirstString(
      "SPORTS_PROVIDER_ASSET_HOSTS",
      `${providerCode}_ASSET_HOSTS`,
      "ASSET_REMOTE_HOSTS"
    )
  );

  return {
    cdnBaseUrl: process.env.ASSET_CDN_BASE_URL || "",
    remoteHosts: remoteHosts.length ? remoteHosts : DEFAULT_REMOTE_HOSTS,
    logoTtlSeconds: Number.parseInt(process.env.ASSET_LOGO_TTL_SECONDS || "2592000", 10),
    articleTtlSeconds: Number.parseInt(process.env.ASSET_ARTICLE_TTL_SECONDS || "86400", 10),
  };
}

export function buildAssetUrl(value, { type = "generic", width = null } = {}) {
  const config = getAssetDeliveryConfig();
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  const fallback = pickFallback(type);

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  let parsedUrl = null;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch (error) {
    return fallback;
  }

  if (!config.cdnBaseUrl) {
    return parsedUrl.toString();
  }

  const cdnUrl = new URL(config.cdnBaseUrl.replace(/\/$/, "") + "/fetch");
  cdnUrl.searchParams.set("url", parsedUrl.toString());
  cdnUrl.searchParams.set("type", type);

  if (width) {
    cdnUrl.searchParams.set("w", String(width));
  }

  return cdnUrl.toString();
}
