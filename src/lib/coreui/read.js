import { unstable_cache } from "next/cache";
import { db } from "../db";
import { getShellChromeContent } from "../control-plane";
import { markCacheFill, observeCachedOperation, observeOperation } from "../operations";
import { buildStandingTable } from "./competition-standings";
import { getPublicSurfaceFlags } from "./feature-flags";
import {
  buildCompetitionOddsModule,
  buildFixtureBroadcastModule,
  buildFixtureOddsModule,
} from "./odds-broadcast";
import {
  buildCompetitionHref,
  buildCountryHref,
  buildSportHref,
  buildTeamHref,
} from "./routes";

async function safely(query, fallback) {
  try {
    return await query();
  } catch (error) {
    return fallback;
  }
}

function fixtureInclude({ includeOdds = true, oddsTake = 2, includeBroadcast = false } = {}) {
  const include = {
    sport: true,
    league: true,
    season: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
  };

  if (includeOdds) {
    include.oddsMarkets = {
      include: { selections: true },
      take: oddsTake,
    };
  }

  if (includeBroadcast) {
    include.broadcastChannels = {
      orderBy: [{ territory: "asc" }, { name: "asc" }],
    };
  }

  return include;
}

function normalizeReference(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function dedupeFixtures(fixtures = []) {
  return [...new Map(fixtures.map((fixture) => [fixture.id, fixture])).values()];
}

function summarizeFixtureStates(fixtures = []) {
  return fixtures.reduce(
    (summary, fixture) => {
      summary.total += 1;
      summary[fixture.status] = (summary[fixture.status] || 0) + 1;
      return summary;
    },
    { total: 0, LIVE: 0, SCHEDULED: 0, FINISHED: 0, POSTPONED: 0, CANCELLED: 0 }
  );
}

function pickSelectedSeason(seasons = [], seasonRef) {
  const normalized = normalizeReference(seasonRef);

  if (normalized) {
    const exact = seasons.find((season) =>
      [season.id, season.externalRef, season.name].includes(normalized)
    );

    if (exact) {
      return exact;
    }
  }

  return seasons.find((season) => season.isCurrent) || seasons[0] || null;
}

function toSeasonSummary(season) {
  return {
    id: season.id,
    name: season.name,
    externalRef: season.externalRef,
    startDate: season.startDate,
    endDate: season.endDate,
    isCurrent: season.isCurrent,
    fixtureCount: season._count?.fixtures || 0,
    standingCount: season._count?.standings || 0,
  };
}

function sortFixturesAsc(fixtures = []) {
  return [...fixtures].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );
}

function sortFixturesDesc(fixtures = []) {
  return [...fixtures].sort(
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
  );
}

function buildRoster(lineupEntries = [], fixtureParticipants = []) {
  const roster = new Map();

  for (const entry of lineupEntries) {
    const key = entry.playerId || entry.player?.id || entry.player?.name;
    if (!key || !entry.player) {
      continue;
    }

    if (!roster.has(key)) {
      roster.set(key, {
        id: entry.player.id,
        name: entry.player.name,
        shortName: entry.player.shortName,
        countryName: entry.player.countryName,
        lastSeenAt: entry.fixture?.startsAt || entry.updatedAt,
      });
    }
  }

  for (const entry of fixtureParticipants) {
    const key = entry.playerId || entry.player?.id || entry.player?.name;
    if (!key || !entry.player || roster.has(key)) {
      continue;
    }

    roster.set(key, {
      id: entry.player.id,
      name: entry.player.name,
      shortName: entry.player.shortName,
      countryName: entry.player.countryName,
      lastSeenAt: entry.fixture?.startsAt || entry.updatedAt,
    });
  }

  return [...roster.values()].sort((left, right) => {
    const lastSeenDifference =
      new Date(right.lastSeenAt || 0).getTime() - new Date(left.lastSeenAt || 0).getTime();

    if (lastSeenDifference !== 0) {
      return lastSeenDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

function buildLinkedCompetitions(team) {
  const linked = new Map();

  const register = (entry) => {
    const code = entry?.code || entry?.leagueCode;
    if (!code) {
      return;
    }

    linked.set(code, {
      code,
      name: entry.name,
      country: entry.country || null,
      seasonName: entry.seasonName || null,
    });
  };

  if (team?.league) {
    register({
      code: team.league.code,
      name: team.league.name,
      country: team.league.country || team.league.countryRecord?.name || team.competition?.country?.name,
    });
  }

  for (const standing of team?.standings || []) {
    register({
      code: standing.season?.league?.code,
      name: standing.season?.league?.name || standing.competition?.name,
      country:
        standing.season?.league?.country ||
        standing.season?.league?.countryRecord?.name ||
        standing.competition?.country?.name,
      seasonName: standing.season?.name || null,
    });
  }

  return [...linked.values()].sort((left, right) => left.name.localeCompare(right.name));
}

const getHomeSnapshotCached = unstable_cache(
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
            sport: true,
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

      const snapshot = { liveFixtures, upcomingFixtures, recentResults, leagues };
      markCacheFill("coreui:home", { surface: "home" });
      return snapshot;
    }, { liveFixtures: [], upcomingFixtures: [], recentResults: [], leagues: [] }),
  ["coreui:home"],
  { revalidate: 120, tags: ["coreui:home"] }
);

export async function getHomeSnapshot() {
  return observeCachedOperation("coreui:home", () => getHomeSnapshotCached(), {
    route: "/",
    revalidateSeconds: 120,
    surface: "home",
  });
}

const getLiveFixturesCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: { status: "LIVE" },
          orderBy: [{ startsAt: "asc" }],
          take: 24,
          include: fixtureInclude(),
        });
        markCacheFill("coreui:live", { surface: "live" });
        return fixtures;
      },
      []
    ),
  ["coreui:live"],
  { revalidate: 30, tags: ["coreui:live"] }
);

export async function getLiveFixtures() {
  return observeCachedOperation("coreui:live", () => getLiveFixturesCached(), {
    route: "/live",
    revalidateSeconds: 30,
    surface: "live",
  });
}

const getUpcomingFixturesCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
          orderBy: [{ startsAt: "asc" }],
          take: 36,
          include: fixtureInclude(),
        });
        markCacheFill("coreui:fixtures", { surface: "fixtures" });
        return fixtures;
      },
      []
    ),
  ["coreui:fixtures"],
  { revalidate: 120, tags: ["coreui:fixtures"] }
);

export async function getUpcomingFixtures() {
  return observeCachedOperation("coreui:fixtures", () => getUpcomingFixturesCached(), {
    route: "/fixtures",
    revalidateSeconds: 120,
    surface: "fixtures",
  });
}

const getRecentResultsCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: { status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] } },
          orderBy: [{ startsAt: "desc" }],
          take: 36,
          include: fixtureInclude(),
        });
        markCacheFill("coreui:results", { surface: "results" });
        return fixtures;
      },
      []
    ),
  ["coreui:results"],
  { revalidate: 180, tags: ["coreui:results"] }
);

export async function getRecentResults() {
  return observeCachedOperation("coreui:results", () => getRecentResultsCached(), {
    route: "/results",
    revalidateSeconds: 180,
    surface: "results",
  });
}

const getTablesOverviewCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const tables = await db.league.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          take: 16,
          include: {
            sport: true,
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
        });
        markCacheFill("coreui:tables", { surface: "tables" });
        return tables;
      },
      []
    ),
  ["coreui:tables"],
  { revalidate: 300, tags: ["coreui:tables"] }
);

export async function getTablesOverview() {
  return observeCachedOperation("coreui:tables", () => getTablesOverviewCached(), {
    route: "/tables",
    revalidateSeconds: 300,
    surface: "tables",
  });
}

const getLeagueDirectoryCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const leagues = await db.league.findMany({
          where: { isActive: true },
          orderBy: [{ country: "asc" }, { name: "asc" }],
          take: 60,
          include: {
            sport: true,
            teams: { select: { id: true } },
            fixtures: {
              orderBy: { startsAt: "asc" },
              take: 1,
              select: { id: true, startsAt: true, status: true },
            },
          },
        });
        markCacheFill("coreui:leagues", { surface: "leagues" });
        return leagues;
      },
      []
    ),
  ["coreui:leagues"],
  { revalidate: 300, tags: ["coreui:leagues"] }
);

export async function getLeagueDirectory() {
  return observeCachedOperation("coreui:leagues", () => getLeagueDirectoryCached(), {
    route: "/leagues",
    revalidateSeconds: 300,
    surface: "leagues",
  });
}

const getShellSnapshotCached = unstable_cache(
  async (locale = "en") =>
    safely(async () => {
      const now = new Date();
      const fixtureWindowStart = new Date(now);
      fixtureWindowStart.setUTCDate(fixtureWindowStart.getUTCDate() - 2);
      const fixtureWindowEnd = new Date(now);
      fixtureWindowEnd.setUTCDate(fixtureWindowEnd.getUTCDate() + 7);

      const [leagues, teams, sports, fixtures, shellChrome] = await Promise.all([
        db.league.findMany({
          where: { isActive: true },
          orderBy: [{ country: "asc" }, { name: "asc" }],
          take: 48,
          select: {
            id: true,
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
            countryRecord: {
              select: {
                code: true,
                slug: true,
                name: true,
              },
            },
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
        db.sport.findMany({
          where: { isEnabled: true },
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
          },
        }),
        db.fixture.findMany({
          where: {
            startsAt: {
              gte: fixtureWindowStart,
              lte: fixtureWindowEnd,
            },
          },
          orderBy: [{ startsAt: "asc" }],
          take: 64,
          select: {
            id: true,
            externalRef: true,
            status: true,
            startsAt: true,
            league: {
              select: {
                code: true,
                name: true,
              },
            },
            homeTeam: {
              select: {
                id: true,
                name: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        getShellChromeContent(locale),
      ]);

      const countryGroups = [...leagues.reduce((accumulator, league) => {
        const countryKey = league.countryRecord?.id || league.countryRecord?.slug || league.country || "";

        if (!accumulator.has(countryKey)) {
          accumulator.set(countryKey, {
            country: league.countryRecord?.name || league.country || null,
            countryCode: league.countryRecord?.code || null,
            countrySlug: league.countryRecord?.slug || null,
            sportSlug: league.sport?.slug || league.sport?.code || "football",
            href:
              league.countryRecord && league.sport
                ? buildCountryHref(locale, league.countryRecord, league.sport).replace(
                    new RegExp(`^/${locale}`),
                    ""
                  )
                : null,
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
        sportSlug: league.sport?.slug || league.sport?.code || "football",
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
        {
          label: leagues[0]?.sport?.name || "Football",
          href: leagues[0]?.sport
            ? buildSportHref(locale, leagues[0].sport).replace(new RegExp(`^/${locale}`), "")
            : "/sports/football",
          type: "sport",
        },
        ...countryGroups.slice(0, 3).map((group) => ({
          label: group.country,
          href: group.href,
          type: "country",
        })),
        ...featuredCompetitions.slice(0, 4).map((competition) => ({
          label: competition.name,
          href: buildCompetitionHref(locale, competition).replace(new RegExp(`^/${locale}`), ""),
          type: "competition",
        })),
        ...teamDirectory.slice(0, 4).map((team) => ({
          label: team.name,
          href: buildTeamHref(locale, team).replace(new RegExp(`^/${locale}`), ""),
          type: "team",
        })),
      ].filter((shortcut) => shortcut.href);

      const fixtureDirectory = fixtures.map((fixture) => ({
        id: fixture.id,
        externalRef: fixture.externalRef,
        label: `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`,
        leagueName: fixture.league?.name || null,
        leagueCode: fixture.league?.code || null,
        status: fixture.status,
      }));

      const snapshot = {
        availableSports: sports,
        featuredCompetitions,
        countryGroups,
        teamDirectory,
        fixtureDirectory,
        searchShortcuts,
        chrome: shellChrome,
      };
      markCacheFill("coreui:shell", { surface: "shell", locale });
      return snapshot;
    }, {
      availableSports: [],
      featuredCompetitions: [],
      countryGroups: [],
      teamDirectory: [],
      fixtureDirectory: [],
      searchShortcuts: [],
      chrome: {
        adSlot: null,
        consentText: null,
        shellModuleMap: {},
      },
    }),
  ["coreui:shell"],
  { revalidate: 300, tags: ["coreui:shell"] }
);

export async function getShellSnapshot(locale = "en") {
  return observeCachedOperation("coreui:shell", () => getShellSnapshotCached(locale), {
    route: "/shell",
    revalidateSeconds: 300,
    surface: "shell",
    locale,
  });
}

export async function getSportHub(reference) {
  const sportReference = normalizeReference(reference);

  return observeOperation(
    {
      metric: "page_read",
      subject: "sport_hub",
      route: `/sports/${sportReference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          sport: result?.sport?.code || sportReference || null,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    () =>
      safely(async () => {
        const sport = await db.sport.findFirst({
          where: {
            isEnabled: true,
            OR: [{ id: sportReference }, { code: sportReference }, { slug: sportReference }],
          },
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
          },
        });

        if (!sport) {
          return null;
        }

        const recentWindow = new Date();
        recentWindow.setUTCDate(recentWindow.getUTCDate() - 1);

        const [leagues, fixtures] = await Promise.all([
          db.league.findMany({
            where: {
              sportId: sport.id,
              isActive: true,
            },
            orderBy: [{ country: "asc" }, { name: "asc" }],
            include: {
              countryRecord: true,
              competition: true,
              teams: { select: { id: true } },
              seasons: {
                where: { isCurrent: true },
                take: 1,
                select: {
                  name: true,
                },
              },
              fixtures: {
                where: {
                  OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
                },
                orderBy: [{ startsAt: "asc" }],
                take: 3,
                include: fixtureInclude({ includeOdds: false }),
              },
            },
          }),
          db.fixture.findMany({
            where: {
              sportId: sport.id,
              OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
            },
            orderBy: [{ startsAt: "asc" }],
            take: 10,
            include: fixtureInclude({ includeOdds: false }),
          }),
        ]);

        const competitions = leagues.map((league) => ({
          id: league.id,
          code: league.code,
          name: league.competition?.name || league.name,
          leagueName: league.name,
          country: league.countryRecord?.name || league.country || null,
          competitionId: league.competitionId,
          currentSeason: league.seasons[0]?.name || null,
          teamCount: league.teams.length,
          fixtureSummary: summarizeFixtureStates(league.fixtures),
          fixtures: league.fixtures,
        }));

        const countries = [...leagues.reduce((accumulator, league) => {
          const key =
            league.countryRecord?.slug || league.countryRecord?.code || league.country || "country";

          if (!accumulator.has(key)) {
            accumulator.set(key, {
              id: league.countryRecord?.id || key,
              code: league.countryRecord?.code || null,
              slug: league.countryRecord?.slug || null,
              name: league.countryRecord?.name || league.country || "Country",
              competitionCount: 0,
              teamCount: 0,
              liveCount: 0,
              scheduledCount: 0,
              featuredLeagueCode: league.code,
            });
          }

          const group = accumulator.get(key);
          group.competitionCount += 1;
          group.teamCount += league.teams.length;
          group.liveCount += league.fixtures.filter((fixture) => fixture.status === "LIVE").length;
          group.scheduledCount += league.fixtures.filter(
            (fixture) => fixture.status === "SCHEDULED"
          ).length;
          return accumulator;
        }, new Map()).values()].sort((left, right) => {
          if (right.competitionCount !== left.competitionCount) {
            return right.competitionCount - left.competitionCount;
          }

          return left.name.localeCompare(right.name);
        });

        return {
          sport,
          countries,
          competitions,
          fixtures,
          fixtureSummary: summarizeFixtureStates(fixtures),
        };
      }, null)
  );
}

export async function getCountryDetail(countryReference, { sportReference = "football" } = {}) {
  const normalizedCountryReference = normalizeReference(countryReference);
  const normalizedSportReference = normalizeReference(sportReference) || "football";

  return observeOperation(
    {
      metric: "page_read",
      subject: "country_detail",
      route: `/sports/${normalizedSportReference}/countries/${normalizedCountryReference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          sport: result?.sport?.code || normalizedSportReference,
          country: result?.country?.code || normalizedCountryReference || null,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    () =>
      safely(async () => {
        const sport = await db.sport.findFirst({
          where: {
            isEnabled: true,
            OR: [
              { id: normalizedSportReference },
              { code: normalizedSportReference },
              { slug: normalizedSportReference },
            ],
          },
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
          },
        });

        if (!sport) {
          return null;
        }

        const country = await db.country.findFirst({
          where: {
            OR: [
              { id: normalizedCountryReference },
              { slug: normalizedCountryReference },
              { code: String(normalizedCountryReference || "").toUpperCase() },
              { name: normalizedCountryReference },
            ],
          },
          select: {
            id: true,
            code: true,
            slug: true,
            name: true,
          },
        });

        if (!country) {
          return null;
        }

        const recentWindow = new Date();
        recentWindow.setUTCDate(recentWindow.getUTCDate() - 1);

        const [leagues, fixtures] = await Promise.all([
          db.league.findMany({
            where: {
              sportId: sport.id,
              isActive: true,
              OR: [
                { countryId: country.id },
                {
                  countryRecord: {
                    id: country.id,
                  },
                },
                { country: country.name },
              ],
            },
            orderBy: [{ name: "asc" }],
            include: {
              competition: true,
              teams: { select: { id: true } },
              seasons: {
                orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
                take: 3,
                select: {
                  id: true,
                  name: true,
                  isCurrent: true,
                  startDate: true,
                  endDate: true,
                  _count: {
                    select: {
                      fixtures: true,
                      standings: true,
                    },
                  },
                },
              },
              fixtures: {
                where: {
                  OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
                },
                orderBy: [{ startsAt: "asc" }],
                take: 4,
                include: fixtureInclude({ includeOdds: false }),
              },
            },
          }),
          db.fixture.findMany({
            where: {
              sportId: sport.id,
              countryId: country.id,
              OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
            },
            orderBy: [{ startsAt: "asc" }],
            take: 10,
            include: fixtureInclude({ includeOdds: false }),
          }),
        ]);

        return {
          sport,
          country,
          competitions: leagues.map((league) => ({
            id: league.id,
            code: league.code,
            name: league.competition?.name || league.name,
            leagueName: league.name,
            competitionId: league.competitionId,
            currentSeason:
              league.seasons.find((season) => season.isCurrent)?.name ||
              league.seasons[0]?.name ||
              null,
            seasons: league.seasons.map(toSeasonSummary),
            teamCount: league.teams.length,
            fixtures: league.fixtures,
            fixtureSummary: summarizeFixtureStates(league.fixtures),
          })),
          fixtures,
          fixtureSummary: summarizeFixtureStates(fixtures),
        };
      }, null)
  );
}

export async function getLeagueDetail(
  reference,
  { locale = "en", viewerTerritory, seasonRef, standingsView = "overall" } = {}
) {
  return observeOperation(
    {
      metric: "page_read",
      subject: "league_detail",
      route: `/leagues/${reference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          league: result?.code || reference || null,
          season: result?.selectedSeason?.name || seasonRef || null,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    async () => {
      const league = await safely(
        async () => {
          const recentWindow = new Date();
          recentWindow.setUTCDate(recentWindow.getUTCDate() - 1);

          const baseLeague = await db.league.findFirst({
            where: {
              OR: [{ id: reference }, { code: reference }],
            },
            include: {
              sport: true,
              countryRecord: true,
              competition: {
                include: {
                  sport: true,
                  country: true,
                },
              },
              teams: {
                orderBy: { name: "asc" },
                take: 24,
              },
              seasons: {
                orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
                take: 8,
                select: {
                  id: true,
                  name: true,
                  externalRef: true,
                  startDate: true,
                  endDate: true,
                  isCurrent: true,
                  _count: {
                    select: {
                      fixtures: true,
                      standings: true,
                    },
                  },
                },
              },
            },
          });

          if (!baseLeague) {
            return null;
          }

          const selectedSeasonSummary = pickSelectedSeason(baseLeague.seasons, seasonRef);
          const [selectedSeasonRecord, seasonFixtures, oddsFixtures] = await Promise.all([
            selectedSeasonSummary
              ? db.season.findUnique({
                  where: {
                    id: selectedSeasonSummary.id,
                  },
                  include: {
                    standings: {
                      orderBy: { position: "asc" },
                      include: {
                        team: true,
                        competition: {
                          include: {
                            country: true,
                          },
                        },
                      },
                    },
                  },
                })
              : Promise.resolve(null),
            selectedSeasonSummary
              ? db.fixture.findMany({
                  where: {
                    seasonId: selectedSeasonSummary.id,
                  },
                  orderBy: [{ startsAt: "asc" }],
                  take: 160,
                  include: fixtureInclude({ includeOdds: false }),
                })
              : Promise.resolve([]),
            db.fixture.findMany({
              where: {
                leagueId: baseLeague.id,
                OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
              },
              orderBy: [{ startsAt: "asc" }],
              take: 12,
              include: fixtureInclude({
                includeOdds: true,
                oddsTake: 12,
                includeBroadcast: true,
              }),
            }),
          ]);

          return {
            ...baseLeague,
            selectedSeasonRecord,
            seasonFixtures,
            oddsFixtures,
          };
        },
        null
      );

      if (!league) {
        return null;
      }

      const flags = await getPublicSurfaceFlags();
      const seasonFixtures = sortFixturesAsc(league.seasonFixtures || []);
      const seasonSummary = league.selectedSeasonRecord
        ? {
            ...toSeasonSummary(league.selectedSeasonRecord),
            standings: league.selectedSeasonRecord.standings || [],
          }
        : null;
      const standingsTable = buildStandingTable({
        teams: league.teams,
        standings: seasonSummary?.standings || [],
        fixtures: seasonFixtures,
        view: standingsView,
      });
      const liveAndUpcomingFixtures = seasonFixtures.filter((fixture) =>
        ["LIVE", "SCHEDULED"].includes(fixture.status)
      );
      const recentResults = sortFixturesDesc(
        seasonFixtures.filter((fixture) =>
          ["FINISHED", "POSTPONED", "CANCELLED"].includes(fixture.status)
        )
      );
      const archiveSeasons = league.seasons.map(toSeasonSummary);

      return {
        ...league,
        country:
          league.countryRecord?.name || league.country || league.competition?.country?.name || null,
        seasons: archiveSeasons,
        selectedSeason: seasonSummary,
        archiveSeasons,
        seasonFixtures,
        fixtures: liveAndUpcomingFixtures.slice(0, 12),
        upcomingFixtures: liveAndUpcomingFixtures.slice(0, 12),
        recentResults: recentResults.slice(0, 12),
        fixtureSummary: summarizeFixtureStates(seasonFixtures),
        standingsTable,
        competitionOdds: buildCompetitionOddsModule(
          { ...league, fixtures: league.oddsFixtures },
          {
            locale,
            viewerTerritory,
            enabled: flags.competitionOdds,
          }
        ),
      };
    }
  );
}

const getTeamDirectoryCached = unstable_cache(
  async () =>
    safely(
      async () => {
        const teams = await db.team.findMany({
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
        });
        markCacheFill("coreui:teams", { surface: "teams" });
        return teams;
      },
      []
    ),
  ["coreui:teams"],
  { revalidate: 300, tags: ["coreui:teams"] }
);

export async function getTeamDirectory() {
  return observeCachedOperation("coreui:teams", () => getTeamDirectoryCached(), {
    route: "/teams",
    revalidateSeconds: 300,
    surface: "teams",
  });
}

export async function getTeamDetail(reference) {
  return observeOperation(
    {
      metric: "page_read",
      subject: "team_detail",
      route: `/teams/${reference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          team: result?.id || reference || null,
          fixtureCount: result?.fixtureSummary?.total || 0,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    () =>
      safely(
        async () => {
          const team = await db.team.findFirst({
            where: {
              OR: [{ id: reference }, { code: reference }],
            },
            include: {
              league: {
                include: {
                  sport: true,
                  countryRecord: true,
                  competition: true,
                },
              },
              competition: {
                include: {
                  country: true,
                  sport: true,
                },
              },
              standings: {
                orderBy: [{ updatedAt: "desc" }, { position: "asc" }],
                include: {
                  competition: {
                    include: {
                      country: true,
                    },
                  },
                  season: {
                    include: {
                      competition: {
                        include: {
                          country: true,
                        },
                      },
                      league: {
                        include: {
                          countryRecord: true,
                        },
                      },
                    },
                  },
                },
              },
              homeFor: {
                orderBy: { startsAt: "desc" },
                take: 12,
                include: fixtureInclude({ includeOdds: false }),
              },
              awayFor: {
                orderBy: { startsAt: "desc" },
                take: 12,
                include: fixtureInclude({ includeOdds: false }),
              },
              lineupEntries: {
                orderBy: { updatedAt: "desc" },
                take: 80,
                include: {
                  player: true,
                  fixture: {
                    select: {
                      startsAt: true,
                    },
                  },
                },
              },
              fixtureParticipants: {
                orderBy: { updatedAt: "desc" },
                take: 80,
                include: {
                  player: true,
                  fixture: {
                    select: {
                      startsAt: true,
                    },
                  },
                },
              },
            },
          });

          if (!team) {
            return null;
          }

          const allFixtures = dedupeFixtures([...team.homeFor, ...team.awayFor]);
          const sortedFixtures = sortFixturesDesc(allFixtures);

          return {
            ...team,
            sport: team.league?.sport || team.competition?.sport || null,
            country:
              team.league?.countryRecord?.name ||
              team.competition?.country?.name ||
              team.league?.country ||
              null,
            fixtures: sortedFixtures.slice(0, 12),
            upcomingFixtures: sortFixturesAsc(
              allFixtures.filter((fixture) => ["LIVE", "SCHEDULED"].includes(fixture.status))
            ).slice(0, 8),
            recentResults: sortedFixtures
              .filter((fixture) => ["FINISHED", "POSTPONED", "CANCELLED"].includes(fixture.status))
              .slice(0, 8),
            fixtureSummary: summarizeFixtureStates(allFixtures),
            roster: buildRoster(team.lineupEntries, team.fixtureParticipants),
            linkedCompetitions: buildLinkedCompetitions(team),
          };
        },
        null
      )
  );
}

export async function getFixtureDetail(
  reference,
  { locale = "en", viewerTerritory } = {}
) {
  return observeOperation(
    {
      metric: "page_read",
      subject: "fixture_detail",
      route: `/match/${reference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          fixture: result?.id || reference || null,
          status: result?.status || null,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    async () => {
      const fixture = await safely(
        () => {
          return db.fixture.findFirst({
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
                orderBy: [{ marketType: "asc" }, { bookmaker: "asc" }],
              },
              broadcastChannels: {
                orderBy: [{ territory: "asc" }, { name: "asc" }],
              },
            },
          });
        },
        null
      );

      if (!fixture) {
        return null;
      }

      const flags = await getPublicSurfaceFlags();

      return {
        ...fixture,
        odds: buildFixtureOddsModule(fixture, {
          locale,
          viewerTerritory,
          enabled: flags.fixtureOdds,
        }),
        broadcast: buildFixtureBroadcastModule(fixture, {
          locale,
          viewerTerritory,
          enabled: flags.fixtureBroadcast,
        }),
      };
    }
  );
}
