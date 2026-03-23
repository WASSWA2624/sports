import { unstable_cache } from "next/cache";
import { db } from "../db";

function buildCoverageFlags(entity) {
  return {
    fixtures: entity.fixtures?.length ? "available" : "missing",
    standings: entity.seasons?.some((season) => season.standings?.length) ? "available" : "missing",
    odds: entity.fixtures?.some((fixture) => fixture.oddsMarkets?.length) ? "available" : "unavailable",
    broadcast: entity.fixtures?.some((fixture) => fixture.broadcastChannels?.length)
      ? "available"
      : "unavailable",
  };
}

export async function getLeagueReadModel(code) {
  const reader = unstable_cache(
    async () =>
      db.league.findUnique({
        where: { code },
        include: {
          teams: {
            orderBy: { name: "asc" },
            take: 20,
          },
          fixtures: {
            orderBy: { startsAt: "asc" },
            take: 10,
            include: {
              homeTeam: true,
              awayTeam: true,
              oddsMarkets: {
                include: { selections: true },
                take: 3,
              },
              broadcastChannels: {
                take: 3,
              },
            },
          },
          seasons: {
            where: { isCurrent: true },
            include: {
              standings: {
                orderBy: { position: "asc" },
                include: { team: true },
              },
            },
          },
        },
      }),
    [`league-read:${code}`],
    { revalidate: 300, tags: [`league:${code}`] }
  );

  const league = await reader();
  if (!league) {
    return null;
  }

  return {
    ...league,
    coverage: buildCoverageFlags(league),
  };
}

export async function getFixtureReadModel(reference) {
  const reader = unstable_cache(
    async () =>
      db.fixture.findFirst({
        where: {
          OR: [{ id: reference }, { externalRef: reference }],
        },
        include: {
          league: true,
          season: true,
          homeTeam: true,
          awayTeam: true,
          resultSnapshot: true,
          oddsMarkets: {
            include: { selections: true },
          },
          broadcastChannels: true,
        },
      }),
    [`fixture-read:${reference}`],
    { revalidate: 60, tags: [`fixture:${reference}`] }
  );

  const fixture = await reader();
  if (!fixture) {
    return null;
  }

  return {
    ...fixture,
    coverage: {
      live: fixture.status === "LIVE" ? "available" : "stale",
      odds: fixture.oddsMarkets.length ? "available" : "unavailable",
      broadcast: fixture.broadcastChannels.length ? "available" : "unavailable",
      result: fixture.resultSnapshot ? "available" : "pending",
    },
  };
}
