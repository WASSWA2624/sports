import { db } from "./db";

const DEFAULT_REMOTE_HOSTS = [
  "images.ctfassets.net",
  "cdn.sportmonks.com",
  "assets.sportsmonks.com",
  "example.com",
];

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function roundPercentage(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 1000) / 10;
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
  const remoteHosts = parseCsv(process.env.ASSET_REMOTE_HOSTS);

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

function buildCoverage(total, covered) {
  return {
    total,
    covered,
    missing: Math.max(0, total - covered),
    coverageRate: total ? roundPercentage(covered / total) : null,
  };
}

export async function getAssetDeliverySnapshot() {
  const config = getAssetDeliveryConfig();

  const [
    totalCompetitions,
    competitionsWithLogos,
    totalTeams,
    teamsWithLogos,
    totalArticles,
    articlesWithImages,
  ] = await Promise.all([
    db.competition.count(),
    db.competition.count({
      where: {
        logoUrl: {
          not: null,
        },
      },
    }),
    db.team.count(),
    db.team.count({
      where: {
        logoUrl: {
          not: null,
        },
      },
    }),
    db.newsArticle.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    db.newsArticle.count({
      where: {
        status: "PUBLISHED",
        imageUrl: {
          not: null,
        },
      },
    }),
  ]);

  return {
    config,
    strategy: [
      {
        assetType: "Competition logos",
        cachePolicy: `${config.logoTtlSeconds}s edge TTL`,
        delivery: config.cdnBaseUrl ? "CDN fetch transform" : "Origin-direct until CDN is configured",
      },
      {
        assetType: "Team logos",
        cachePolicy: `${config.logoTtlSeconds}s edge TTL`,
        delivery: config.cdnBaseUrl ? "CDN fetch transform" : "Origin-direct until CDN is configured",
      },
      {
        assetType: "Article media",
        cachePolicy: `${config.articleTtlSeconds}s edge TTL`,
        delivery: config.cdnBaseUrl
          ? "CDN fetch transform with shareable Open Graph variants"
          : "Origin-direct until CDN is configured",
      },
    ],
    coverage: {
      competitions: buildCoverage(totalCompetitions, competitionsWithLogos),
      teams: buildCoverage(totalTeams, teamsWithLogos),
      articles: buildCoverage(totalArticles, articlesWithImages),
    },
  };
}
