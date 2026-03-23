import { unstable_cache } from "next/cache";
import { db } from "../db";

async function safely(query, fallback) {
  try {
    return await query();
  } catch (error) {
    return fallback;
  }
}

function fixtureInclude() {
  return {
    league: true,
    season: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
    oddsMarkets: {
      include: { selections: true },
      take: 2,
    },
  };
}

export const getHomeSnapshot = unstable_cache(
  async () =>
    safely(async () => {
      const now = new Date();
      const [liveFixtures, upcomingFixtures, recentResults, leagues] = await Promise.all([
        db.fixture.findMany({
          where: { status: "LIVE" },
          orderBy: { startsAt: "asc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.fixture.findMany({
          where: { status: "SCHEDULED", startsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.fixture.findMany({
          where: { status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] } },
          orderBy: { startsAt: "desc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.league.findMany({
          where: { isActive: true },
          orderBy: [{ name: "asc" }],
          take: 6,
          include: {
            teams: { take: 3, orderBy: { name: "asc" } },
            seasons: {
              where: { isCurrent: true },
              take: 1,
              include: {
                standings: {
                  take: 3,
                  orderBy: { position: "asc" },
                  include: { team: true },
                },
              },
            },
          },
        }),
      ]);

      return { liveFixtures, upcomingFixtures, recentResults, leagues };
    }, { liveFixtures: [], upcomingFixtures: [], recentResults: [], leagues: [] }),
  ["coreui:home"],
  { revalidate: 120, tags: ["coreui:home"] }
);

export const getLiveFixtures = unstable_cache(
  async () =>
    safely(
      () =>
        db.fixture.findMany({
          where: { status: "LIVE" },
          orderBy: [{ startsAt: "asc" }],
          take: 24,
          include: fixtureInclude(),
        }),
      []
    ),
  ["coreui:live"],
  { revalidate: 30, tags: ["coreui:live"] }
);

export const getUpcomingFixtures = unstable_cache(
  async () =>
    safely(
      () =>
        db.fixture.findMany({
          where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
          orderBy: [{ startsAt: "asc" }],
          take: 36,
          include: fixtureInclude(),
        }),
      []
    ),
  ["coreui:fixtures"],
  { revalidate: 120, tags: ["coreui:fixtures"] }
);

export const getRecentResults = unstable_cache(
  async () =>
    safely(
      () =>
        db.fixture.findMany({
          where: { status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] } },
          orderBy: [{ startsAt: "desc" }],
          take: 36,
          include: fixtureInclude(),
        }),
      []
    ),
  ["coreui:results"],
  { revalidate: 180, tags: ["coreui:results"] }
);

export const getTablesOverview = unstable_cache(
  async () =>
    safely(
      () =>
        db.league.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          take: 16,
          include: {
            seasons: {
              where: { isCurrent: true },
              take: 1,
              include: {
                standings: {
                  orderBy: { position: "asc" },
                  take: 8,
                  include: { team: true },
                },
              },
            },
          },
        }),
      []
    ),
  ["coreui:tables"],
  { revalidate: 300, tags: ["coreui:tables"] }
);

export const getLeagueDirectory = unstable_cache(
  async () =>
    safely(
      () =>
        db.league.findMany({
          where: { isActive: true },
          orderBy: [{ country: "asc" }, { name: "asc" }],
          take: 60,
          include: {
            teams: { select: { id: true } },
            fixtures: {
              orderBy: { startsAt: "asc" },
              take: 1,
              select: { id: true, startsAt: true, status: true },
            },
          },
        }),
      []
    ),
  ["coreui:leagues"],
  { revalidate: 300, tags: ["coreui:leagues"] }
);

export const getShellSnapshot = unstable_cache(
  async () =>
    safely(async () => {
      const [leagues, teams] = await Promise.all([
        db.league.findMany({
          where: { isActive: true },
          orderBy: [{ country: "asc" }, { name: "asc" }],
          take: 48,
          select: {
            id: true,
            code: true,
            name: true,
            country: true,
          },
        }),
        db.team.findMany({
          orderBy: [{ name: "asc" }],
          take: 48,
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
            league: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        }),
      ]);

      const countryGroups = [...leagues.reduce((accumulator, league) => {
        const countryKey = league.country || "";

        if (!accumulator.has(countryKey)) {
          accumulator.set(countryKey, {
            country: league.country || null,
            leagues: [],
          });
        }

        accumulator.get(countryKey).leagues.push({
          code: league.code,
          name: league.name,
        });
        return accumulator;
      }, new Map()).values()]
        .sort((left, right) => (left.country || "").localeCompare(right.country || ""))
        .slice(0, 10);

      const featuredCompetitions = leagues.slice(0, 8).map((league) => ({
        code: league.code,
        name: league.name,
        country: league.country || null,
      }));

      const teamDirectory = teams.map((team) => ({
        id: team.id,
        code: team.code,
        name: team.name,
        shortName: team.shortName,
        leagueCode: team.league?.code || null,
        leagueName: team.league?.name || null,
      }));

      const searchShortcuts = [
        ...featuredCompetitions.slice(0, 4).map((competition) => ({
          label: competition.name,
          href: `/leagues/${competition.code}`,
          type: "competition",
        })),
        ...teamDirectory.slice(0, 4).map((team) => ({
          label: team.name,
          href: `/teams/${team.id}`,
          type: "team",
        })),
      ];

      return {
        featuredCompetitions,
        countryGroups,
        teamDirectory,
        searchShortcuts,
      };
    }, {
      featuredCompetitions: [],
      countryGroups: [],
      teamDirectory: [],
      searchShortcuts: [],
    }),
  ["coreui:shell"],
  { revalidate: 300, tags: ["coreui:shell"] }
);

export async function getLeagueDetail(reference) {
  return safely(
    () =>
      db.league.findFirst({
        where: {
          OR: [{ id: reference }, { code: reference }],
        },
        include: {
          teams: {
            orderBy: { name: "asc" },
            take: 24,
          },
          fixtures: {
            orderBy: { startsAt: "asc" },
            take: 12,
            include: fixtureInclude(),
          },
          seasons: {
            where: { isCurrent: true },
            take: 1,
            include: {
              standings: {
                orderBy: { position: "asc" },
                include: { team: true },
              },
            },
          },
        },
      }),
    null
  );
}

export const getTeamDirectory = unstable_cache(
  async () =>
    safely(
      () =>
        db.team.findMany({
          orderBy: [{ name: "asc" }],
          take: 100,
          include: {
            league: true,
            homeFor: {
              orderBy: { startsAt: "desc" },
              take: 1,
              select: { id: true, startsAt: true, status: true },
            },
          },
        }),
      []
    ),
  ["coreui:teams"],
  { revalidate: 300, tags: ["coreui:teams"] }
);

export async function getTeamDetail(reference) {
  return safely(
    () =>
      db.team.findFirst({
        where: {
          OR: [{ id: reference }, { code: reference }],
        },
        include: {
          league: true,
          standings: {
            orderBy: { position: "asc" },
            include: { season: { include: { league: true } } },
          },
          homeFor: {
            orderBy: { startsAt: "desc" },
            take: 6,
            include: fixtureInclude(),
          },
          awayFor: {
            orderBy: { startsAt: "desc" },
            take: 6,
            include: fixtureInclude(),
          },
        },
      }),
    null
  );
}

export async function getFixtureDetail(reference) {
  return safely(
    () =>
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
        },
      }),
    null
  );
}
