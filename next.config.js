const DEFAULT_ASSET_REMOTE_HOSTS = [
  "images.ctfassets.net",
  "cdn.sportmonks.com",
  "assets.sportsmonks.com",
  "example.com",
];

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
  const configuredHosts = parseCsv(process.env.ASSET_REMOTE_HOSTS);
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
