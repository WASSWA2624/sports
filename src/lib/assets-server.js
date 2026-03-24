import { buildAssetUrl, getAssetDeliveryConfig } from "./assets";
import { db } from "./db";

function roundPercentage(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 1000) / 10;
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
        sampleUrl: buildAssetUrl("/globe.svg", { type: "competition-logo" }),
      },
      {
        assetType: "Team logos",
        cachePolicy: `${config.logoTtlSeconds}s edge TTL`,
        delivery: config.cdnBaseUrl ? "CDN fetch transform" : "Origin-direct until CDN is configured",
        sampleUrl: buildAssetUrl("/globe.svg", { type: "team-logo" }),
      },
      {
        assetType: "Article media",
        cachePolicy: `${config.articleTtlSeconds}s edge TTL`,
        delivery: config.cdnBaseUrl
          ? "CDN fetch transform with shareable Open Graph variants"
          : "Origin-direct until CDN is configured",
        sampleUrl: buildAssetUrl("/window.svg", { type: "article-image", width: 1200 }),
      },
    ],
    coverage: {
      competitions: buildCoverage(totalCompetitions, competitionsWithLogos),
      teams: buildCoverage(totalTeams, teamsWithLogos),
      articles: buildCoverage(totalArticles, articlesWithImages),
    },
  };
}
