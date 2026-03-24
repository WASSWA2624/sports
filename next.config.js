const DEFAULT_ASSET_REMOTE_HOSTS = [
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

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => normalizeRemoteHost(entry))
    .filter(Boolean);
}

function buildRemotePatterns() {
  const providerCode = normalizeProviderCode(process.env.SPORTS_DATA_PROVIDER);
  const configuredHosts = parseCsv(
    readFirstString(
      "SPORTS_PROVIDER_ASSET_HOSTS",
      `${providerCode}_ASSET_HOSTS`,
      "ASSET_REMOTE_HOSTS"
    )
  );
  const hostnames = configuredHosts.length ? configuredHosts : DEFAULT_ASSET_REMOTE_HOSTS;

  return [...new Set(hostnames)].flatMap((hostname) => [
    {
      protocol: "https",
      hostname,
    },
    {
      protocol: "http",
      hostname,
    },
  ]);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

module.exports = nextConfig;
