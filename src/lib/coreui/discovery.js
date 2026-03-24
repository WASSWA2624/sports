import { unstable_cache } from "next/cache";
import { db } from "../db";
import { safeDataRead } from "../data-access";
import { parseFavoriteItemId } from "../favorites";
import { GEO_LABELS, SUPPORTED_MARKET_GEOS } from "./route-context";
import { buildCompetitionHref, buildMatchHref, buildTeamHref } from "./routes";

const TOP_COMPETITION_WINDOW_DAYS = 7;

function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function safeParseFavoriteItemId(itemId) {
  try {
    return parseFavoriteItemId(itemId);
  } catch (error) {
    return null;
  }
}

function buildFixtureInclude() {
  return {
    league: {
      select: {
        code: true,
        name: true,
        country: true,
      },
    },
    homeTeam: {
      select: {
        id: true,
        name: true,
        shortName: true,
      },
    },
    awayTeam: {
      select: {
        id: true,
        name: true,
        shortName: true,
      },
    },
    resultSnapshot: true,
  };
}

const getTopCompetitionsModuleCached = unstable_cache(
  async (limit = 6) => {
    const boundedLimit = Math.min(Math.max(Number(limit) || 6, 1), 12);
    const now = new Date();
    const windowEnd = addDays(now, TOP_COMPETITION_WINDOW_DAYS);
    const leagues = await db.league.findMany({
      where: {
        isActive: true,
        fixtures: {
          some: {
            OR: [
              { status: "LIVE" },
              {
                startsAt: {
                  gte: now,
                  lte: windowEnd,
                },
              },
            ],
          },
        },
      },
      orderBy: [{ name: "asc" }],
      take: boundedLimit * 2,
      include: {
        _count: {
          select: {
            teams: true,
          },
        },
        seasons: {
          where: { isCurrent: true },
          take: 1,
          select: {
            name: true,
          },
        },
        fixtures: {
          where: {
            OR: [
              { status: "LIVE" },
              {
                startsAt: {
                  gte: now,
                  lte: windowEnd,
                },
              },
            ],
          },
          orderBy: [{ startsAt: "asc" }],
          take: 4,
          include: buildFixtureInclude(),
        },
      },
    });

    return leagues
      .map((league) => {
        const liveCount = league.fixtures.filter((fixture) => fixture.status === "LIVE").length;
        const scheduledCount = league.fixtures.filter(
          (fixture) => fixture.status === "SCHEDULED"
        ).length;

        return {
          id: league.id,
          code: league.code,
          name: league.name,
          country: league.country || null,
          currentSeason: league.seasons[0]?.name || null,
          teamCount: league._count?.teams || 0,
          fixtures: league.fixtures,
          liveCount,
          scheduledCount,
          score: liveCount * 60 + scheduledCount * 24 + (league._count?.teams || 0),
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, boundedLimit);
  },
  ["coreui:top-competitions"],
  { revalidate: 300, tags: ["coreui:home", "coreui:leagues"] }
);

export async function getTopCompetitionsModule(limit = 6) {
  return safeDataRead(() => getTopCompetitionsModuleCached(limit), [], {
    label: "Top competitions module",
  });
}

export async function getRecentItemsModule(personalization, { locale = "en", limit = 6 } = {}) {
  const recentItems = (personalization?.recentViewIds || [])
    .map((itemId) => ({
      itemId,
      parsed: safeParseFavoriteItemId(itemId),
    }))
    .filter((entry) => entry.parsed)
    .slice(0, Math.max(limit * 2, limit));

  if (!recentItems.length) {
    return [];
  }

  const grouped = recentItems.reduce(
    (accumulator, entry) => {
      accumulator[entry.parsed.entityType].push(entry.parsed.entityId);
      return accumulator;
    },
    {
      FIXTURE: [],
      TEAM: [],
      COMPETITION: [],
    }
  );

  const [fixtures, teams, competitions] = await safeDataRead(
    () =>
      Promise.all([
        grouped.FIXTURE.length
          ? db.fixture.findMany({
              where: {
                id: { in: grouped.FIXTURE },
              },
              include: buildFixtureInclude(),
            })
          : Promise.resolve([]),
        grouped.TEAM.length
          ? db.team.findMany({
              where: {
                id: { in: grouped.TEAM },
              },
              include: {
                league: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        grouped.COMPETITION.length
          ? db.league.findMany({
              where: {
                code: { in: grouped.COMPETITION },
              },
              select: {
                id: true,
                code: true,
                name: true,
                country: true,
              },
            })
          : Promise.resolve([]),
      ]),
    [[], [], []],
    { label: "Recent items module" }
  );

  const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const competitionMap = new Map(competitions.map((competition) => [competition.code, competition]));

  return recentItems
    .map((entry) => {
      if (entry.parsed.entityType === "FIXTURE") {
        const fixture = fixtureMap.get(entry.parsed.entityId);
        if (!fixture) {
          return null;
        }

        return {
          key: entry.itemId,
          type: "match",
          title: `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`,
          subtitle: [fixture.league?.name, fixture.status].filter(Boolean).join(" • "),
          href: buildMatchHref(locale, fixture),
        };
      }

      if (entry.parsed.entityType === "TEAM") {
        const team = teamMap.get(entry.parsed.entityId);
        if (!team) {
          return null;
        }

        return {
          key: entry.itemId,
          type: "team",
          title: team.name,
          subtitle: team.league?.name || "Team",
          href: buildTeamHref(locale, team),
        };
      }

      const competition = competitionMap.get(entry.parsed.entityId);
      if (!competition) {
        return null;
      }

      return {
        key: entry.itemId,
        type: "competition",
        title: competition.name,
        subtitle: competition.country || "Competition",
        href: buildCompetitionHref(locale, competition),
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

function compareRelatedFixtures(left, right) {
  const priority = {
    LIVE: 0,
    SCHEDULED: 1,
    FINISHED: 2,
    POSTPONED: 3,
    CANCELLED: 4,
  };
  const leftPriority = priority[left.status] ?? 99;
  const rightPriority = priority[right.status] ?? 99;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
}

export async function getRelatedMatchesModule(
  { fixtureId, leagueId, homeTeamId, awayTeamId },
  limit = 6
) {
  if (!fixtureId || (!leagueId && !homeTeamId && !awayTeamId)) {
    return [];
  }

  const fixtures = await safeDataRead(
    () =>
      db.fixture.findMany({
        where: {
          id: {
            not: fixtureId,
          },
          OR: [
            leagueId ? { leagueId } : null,
            homeTeamId ? { homeTeamId } : null,
            awayTeamId ? { awayTeamId } : null,
            homeTeamId ? { awayTeamId: homeTeamId } : null,
            awayTeamId ? { homeTeamId: awayTeamId } : null,
          ].filter(Boolean),
        },
        orderBy: [{ startsAt: "asc" }],
        take: limit * 3,
        include: buildFixtureInclude(),
      }),
    [],
    { label: "Related matches module" }
  );

  return fixtures.sort(compareRelatedFixtures).slice(0, limit);
}

const getOnboardingDiscoveryOptionsCached = unstable_cache(
  async (limit = 10) => {
    const boundedLimit = Math.min(Math.max(Number(limit) || 10, 4), 16);
    const now = new Date();
    const windowEnd = addDays(now, TOP_COMPETITION_WINDOW_DAYS);
    const [sports, competitions, teams] = await Promise.all([
      db.sport.findMany({
        where: { isEnabled: true },
        orderBy: [{ name: "asc" }],
        take: 12,
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
        },
      }),
      db.league.findMany({
        where: {
          isActive: true,
          fixtures: {
            some: {
              OR: [
                { status: "LIVE" },
                {
                  startsAt: {
                    gte: now,
                    lte: windowEnd,
                  },
                },
              ],
            },
          },
        },
        orderBy: [{ name: "asc" }],
        take: boundedLimit * 2,
        include: {
          sport: {
            select: {
              code: true,
              slug: true,
              name: true,
            },
          },
          countryRecord: {
            select: {
              code: true,
              name: true,
              slug: true,
            },
          },
          fixtures: {
            where: {
              OR: [
                { status: "LIVE" },
                {
                  startsAt: {
                    gte: now,
                    lte: windowEnd,
                  },
                },
              ],
            },
            orderBy: [{ startsAt: "asc" }],
            take: 4,
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              teams: true,
            },
          },
        },
      }),
      db.team.findMany({
        orderBy: [{ name: "asc" }],
        take: boundedLimit * 4,
        include: {
          league: {
            select: {
              code: true,
              name: true,
              country: true,
              sport: {
                select: {
                  code: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
          homeFor: {
            where: {
              OR: [
                { status: "LIVE" },
                {
                  startsAt: {
                    gte: now,
                    lte: windowEnd,
                  },
                },
              ],
            },
            orderBy: [{ startsAt: "asc" }],
            take: 1,
            select: {
              id: true,
            },
          },
          awayFor: {
            where: {
              OR: [
                { status: "LIVE" },
                {
                  startsAt: {
                    gte: now,
                    lte: windowEnd,
                  },
                },
              ],
            },
            orderBy: [{ startsAt: "asc" }],
            take: 1,
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const competitionOptions = competitions
      .map((competition) => {
        const liveCount = competition.fixtures.filter((fixture) => fixture.status === "LIVE").length;
        const scheduledCount = competition.fixtures.filter(
          (fixture) => fixture.status === "SCHEDULED"
        ).length;

        return {
          code: competition.code,
          name: competition.name,
          country: competition.countryRecord?.name || competition.country || null,
          countryCode: competition.countryRecord?.code || null,
          sportCode: competition.sport?.slug || competition.sport?.code || null,
          sportName: competition.sport?.name || null,
          liveCount,
          scheduledCount,
          teamCount: competition._count?.teams || 0,
          score: liveCount * 80 + scheduledCount * 30 + (competition._count?.teams || 0),
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, boundedLimit);

    const competitionCodeSet = new Set(competitionOptions.map((competition) => competition.code));
    const teamOptions = teams
      .filter((team) => competitionCodeSet.has(team.league?.code))
      .map((team) => ({
        id: team.id,
        name: team.name,
        shortName: team.shortName || null,
        leagueCode: team.league?.code || null,
        leagueName: team.league?.name || null,
        country: team.league?.country || null,
        sportCode: team.league?.sport?.slug || team.league?.sport?.code || null,
        hasUpcomingFixture: Boolean(team.homeFor?.length || team.awayFor?.length),
      }))
      .sort((left, right) => {
        const priorityDifference =
          Number(Boolean(right.hasUpcomingFixture)) - Number(Boolean(left.hasUpcomingFixture));
        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, Math.max(boundedLimit + 4, 10));

    return {
      sports,
      competitions: competitionOptions,
      teams: teamOptions,
      geoOptions: SUPPORTED_MARKET_GEOS.map((geo) => ({
        code: geo,
        label: GEO_LABELS[geo] || geo,
      })),
    };
  },
  ["coreui:onboarding-discovery"],
  { revalidate: 300, tags: ["coreui:home", "coreui:leagues", "coreui:teams"] }
);

export async function getOnboardingDiscoveryOptions(limit = 10) {
  return safeDataRead(() => getOnboardingDiscoveryOptionsCached(limit), {
    sports: [],
    competitions: [],
    teams: [],
    geoOptions: SUPPORTED_MARKET_GEOS.map((geo) => ({
      code: geo,
      label: GEO_LABELS[geo] || geo,
    })),
  }, {
    label: "Onboarding discovery options",
  });
}
