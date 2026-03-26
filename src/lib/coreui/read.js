import { unstable_cache } from "next/cache";
import { db } from "../db";
import { safeDataRead, withDataAccessTimeout } from "../data-access";
import { getShellChromeContent } from "../control-plane";
import { getPlatformPublicSnapshot, getPlatformPublicSnapshotData } from "../platform/env";
import {
  ensureCatalogSportsDataFresh,
  ensureStableSportsDataFresh,
  ensureVolatileSportsDataFresh,
} from "../sports/freshness";
import { markCacheFill, observeCachedOperation, observeOperation } from "../operations";
import { buildStandingTable } from "./competition-standings";
import {
  buildCompetitionBettingExperience,
  buildFixtureBettingExperience,
} from "./odds-experience";
import { buildCompetitionOddsModule } from "./odds-broadcast";
import { getPublicSurfaceFlags } from "./feature-flags";
import { buildReferenceWhere } from "./references";
import {
  buildCompetitionHref,
  buildCountryHref,
  buildSportHref,
  buildTeamHref,
} from "./routes";
import { buildPrimarySportRelationFilter, PRIMARY_SPORT_CODE } from "./scope";
import { SPORTS_STRIP } from "./config";

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

async function readWithFallback(task, fallback, options = {}, onError = null) {
  const { label = "Data access", ...timeoutOptions } = options;

  try {
    return await withDataAccessTimeout(task, { label, ...timeoutOptions });
  } catch (error) {
    if (typeof onError === "function") {
      onError(error);
    }

    return fallback;
  }
}

function buildFallbackCompetitionBettingExperience(
  league,
  { locale = "en", viewerTerritory, flags } = {}
) {
  return {
    ...buildCompetitionOddsModule(
      { ...league, fixtures: league?.oddsFixtures || league?.fixtures || [] },
      {
        locale,
        viewerTerritory,
        enabled: Boolean(flags?.competitionOdds),
      }
    ),
    bookmakers: [],
    ctaConfig: null,
    insights: {
      predictionsEnabled: Boolean(flags?.predictions),
      predictionMessage: null,
      topPicks: [],
      valueBets: [],
      bestOdds: [],
      highOddsMatches: [],
      bestBet: null,
    },
  };
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

function resolveCatalogSport(reference) {
  const normalized = normalizeReference(reference);
  if (!normalized) {
    return null;
  }

  const target = String(normalized).trim().toLowerCase();
  return (
    SPORTS_STRIP.find((sport) => {
      if (["favorites", "more"].includes(sport.key)) {
        return false;
      }

      const hrefSlug = sport.href ? String(sport.href).split("/").filter(Boolean).at(-1) : null;
      return [sport.key, sport.label, hrefSlug]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === target);
    }) || null
  );
}

function buildFallbackSportHub(reference) {
  const sport = resolveCatalogSport(reference);
  if (!sport) {
    return null;
  }

  return {
    sport: {
      id: null,
      code: sport.key,
      slug: sport.key,
      name: sport.label,
    },
    countries: [],
    competitions: [],
    fixtures: [],
    fixtureSummary: summarizeFixtureStates([]),
  };
}

function pickSelectedSeason(seasons = [], seasonRef) {
  const normalized = normalizeReference(seasonRef);

  if (normalized) {
    const target = String(normalized).trim().toLowerCase();
    const exact = seasons.find((season) =>
      [season.id, season.externalRef, season.name]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === target)
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

function pickSelectedCompetition(competitions = [], competitionRef) {
  const normalized = normalizeReference(competitionRef);

  if (normalized) {
    const target = String(normalized).trim().toLowerCase();
    const exact = competitions.find((competition) =>
      [
        competition.id,
        competition.leagueId,
        competition.code,
        competition.name,
        competition.competitionId,
      ]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === target)
    );

    if (exact) {
      return exact;
    }
  }

  return competitions.find((competition) => competition.isCurrent) || competitions[0] || null;
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
    const key = entry?.leagueId || entry?.id || entry?.code || entry?.leagueCode;
    if (!key) {
      return;
    }

    linked.set(key, {
      id: entry?.id || entry?.leagueId || entry?.code || entry?.leagueCode,
      leagueId: entry?.leagueId || entry?.id || null,
      competitionId: entry?.competitionId || null,
      code: entry?.code || entry?.leagueCode || null,
      name: entry.name,
      country: entry.country || null,
      countryRecord: entry.countryRecord || null,
      sport: entry.sport || null,
      seasonName: entry.seasonName || null,
      isCurrent: Boolean(entry.isCurrent),
    });
  };

  if (team?.league) {
    register({
      id: team.league.id,
      leagueId: team.league.id,
      competitionId: team.league.competitionId,
      code: team.league.code,
      name: team.league.name,
      country: team.league.country || team.league.countryRecord?.name || team.competition?.country?.name,
      countryRecord: team.league.countryRecord || team.competition?.country || null,
      sport: team.league.sport || team.competition?.sport || null,
      isCurrent: true,
    });
  }

  for (const standing of team?.standings || []) {
    register({
      id: standing.season?.league?.id,
      leagueId: standing.season?.league?.id,
      competitionId: standing.season?.league?.competitionId || standing.competitionId,
      code: standing.season?.league?.code,
      name: standing.season?.league?.name || standing.competition?.name,
      country:
        standing.season?.league?.country ||
        standing.season?.league?.countryRecord?.name ||
        standing.competition?.country?.name,
      countryRecord: standing.season?.league?.countryRecord || standing.competition?.country || null,
      sport: standing.season?.league?.sport || standing.competition?.sport || null,
      seasonName: standing.season?.name || null,
      isCurrent: Boolean(standing.season?.isCurrent),
    });
  }

  return [...linked.values()].sort((left, right) => {
    const currentDifference = Number(Boolean(right.isCurrent)) - Number(Boolean(left.isCurrent));
    if (currentDifference !== 0) {
      return currentDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

async function ensureStableBackendData() {
  await ensureStableSportsDataFresh();
}

async function ensureCatalogBackedData() {
  await Promise.all([ensureStableSportsDataFresh(), ensureCatalogSportsDataFresh()]);
}

async function ensureLiveBackendData() {
  await Promise.all([
    ensureStableSportsDataFresh(),
    ensureVolatileSportsDataFresh({ waitForCompletion: true }),
    ensureCatalogSportsDataFresh(),
  ]);
}

const getHomeSnapshotCached = unstable_cache(
  async () =>
    safeDataRead(async () => {
      const now = new Date();
      const [liveFixtures, upcomingFixtures, recentResults, leagues] = await Promise.all([
        db.fixture.findMany({
          where: {
            status: "LIVE",
            sport: buildPrimarySportRelationFilter(),
          },
          orderBy: { startsAt: "asc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.fixture.findMany({
          where: {
            status: "SCHEDULED",
            startsAt: { gte: now },
            sport: buildPrimarySportRelationFilter(),
          },
          orderBy: { startsAt: "asc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.fixture.findMany({
          where: {
            status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] },
            sport: buildPrimarySportRelationFilter(),
          },
          orderBy: { startsAt: "desc" },
          take: 6,
          include: fixtureInclude(),
        }),
        db.league.findMany({
          where: {
            isActive: true,
            sport: buildPrimarySportRelationFilter(),
          },
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
                  where: { scope: "OVERALL" },
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
  await ensureLiveBackendData();
  return observeCachedOperation("coreui:home", () => getHomeSnapshotCached(), {
    route: "/",
    revalidateSeconds: 120,
    surface: "home",
  });
}

const getLiveFixturesCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: {
            status: "LIVE",
            sport: buildPrimarySportRelationFilter(),
          },
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
  await ensureLiveBackendData();
  return observeCachedOperation("coreui:live", () => getLiveFixturesCached(), {
    route: "/live",
    revalidateSeconds: 30,
    surface: "live",
  });
}

const getUpcomingFixturesCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: {
            status: "SCHEDULED",
            startsAt: { gte: new Date() },
            sport: buildPrimarySportRelationFilter(),
          },
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
  await ensureStableBackendData();
  return observeCachedOperation("coreui:fixtures", () => getUpcomingFixturesCached(), {
    route: "/fixtures",
    revalidateSeconds: 120,
    surface: "fixtures",
  });
}

const getRecentResultsCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const fixtures = await db.fixture.findMany({
          where: {
            status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] },
            sport: buildPrimarySportRelationFilter(),
          },
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
  await ensureStableBackendData();
  return observeCachedOperation("coreui:results", () => getRecentResultsCached(), {
    route: "/results",
    revalidateSeconds: 180,
    surface: "results",
  });
}

const getTablesOverviewCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const tables = await db.league.findMany({
          where: {
            isActive: true,
            sport: buildPrimarySportRelationFilter(),
          },
          orderBy: { name: "asc" },
          take: 16,
          include: {
            sport: true,
            seasons: {
              where: { isCurrent: true },
              take: 1,
              include: {
                standings: {
                  where: { scope: "OVERALL" },
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
  await ensureStableBackendData();
  return observeCachedOperation("coreui:tables", () => getTablesOverviewCached(), {
    route: "/tables",
    revalidateSeconds: 300,
    surface: "tables",
  });
}

const getLeagueDirectoryCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const leagues = await db.league.findMany({
          where: {
            isActive: true,
            sport: buildPrimarySportRelationFilter(),
          },
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
  await ensureStableBackendData();
  return observeCachedOperation("coreui:leagues", () => getLeagueDirectoryCached(), {
    route: "/leagues",
    revalidateSeconds: 300,
    surface: "leagues",
  });
}

const getShellSnapshotCached = unstable_cache(
  async (locale = "en") =>
    safeDataRead(async () => {
      const now = new Date();
      const fixtureWindowStart = new Date(now);
      fixtureWindowStart.setUTCDate(fixtureWindowStart.getUTCDate() - 2);
      const fixtureWindowEnd = new Date(now);
      fixtureWindowEnd.setUTCDate(fixtureWindowEnd.getUTCDate() + 7);

      const [leagues, teams, sports, fixtures, shellChrome] = await Promise.all([
        db.league.findMany({
          where: {
            isActive: true,
            sport: buildPrimarySportRelationFilter(),
          },
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
          where: {
            league: {
              is: {
                sport: buildPrimarySportRelationFilter(),
              },
            },
          },
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
          where: {
            isEnabled: true,
            code: PRIMARY_SPORT_CODE,
          },
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
            sport: buildPrimarySportRelationFilter(),
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
      const platform = await getPlatformPublicSnapshotData();

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
        platform,
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
      platform: getPlatformPublicSnapshot(),
    }),
  ["coreui:shell"],
  { revalidate: 300, tags: ["coreui:shell"] }
);

export async function getShellSnapshot(locale = "en") {
  await ensureStableBackendData();
  return observeCachedOperation("coreui:shell", () => getShellSnapshotCached(locale), {
    route: "/shell",
    revalidateSeconds: 300,
    surface: "shell",
    locale,
  });
}

export async function getSportHub(reference) {
  await ensureStableBackendData();
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
      safeDataRead(async () => {
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
          return buildFallbackSportHub(sportReference);
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
  await ensureStableBackendData();
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
      safeDataRead(async () => {
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
  await ensureCatalogBackedData();
  return observeOperation(
    {
      metric: "page_read",
      subject: "league_detail",
      route: `/leagues/${reference || ""}`,
      statusFromResult(result) {
        if (!result) {
          return "empty";
        }

        return result.degraded ? "degraded" : "ok";
      },
      metadata(result) {
        return {
          league: result?.code || reference || null,
          season: result?.selectedSeason?.name || seasonRef || null,
          degraded: Boolean(result?.degraded),
        };
      },
      eventOptions: {
        force: true,
      },
    },
    async () => {
      const referenceWhere = buildReferenceWhere(reference, ["id", "code", "externalRef"]);
      if (!referenceWhere) {
        return null;
      }

      const recentWindow = new Date();
      recentWindow.setUTCDate(recentWindow.getUTCDate() - 1);

          const baseLeague = await withDataAccessTimeout(
        () =>
          db.league.findFirst({
            where: {
              AND: [referenceWhere, { sport: buildPrimarySportRelationFilter() }],
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
          }),
        {
          label: "League detail read",
          timeoutMs: 12000,
        }
      );

      if (!baseLeague) {
        return null;
      }

      let degraded = false;
      const markDegraded = () => {
        degraded = true;
      };

      const selectedSeasonSummary = pickSelectedSeason(baseLeague.seasons, seasonRef);
      const [selectedSeasonRecord, seasonFixtures, oddsFixtures] = await Promise.all([
        selectedSeasonSummary
          ? readWithFallback(
              () =>
                db.season.findUnique({
                  where: {
                    id: selectedSeasonSummary.id,
                  },
                  include: {
                    standings: {
                      where: { scope: "OVERALL" },
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
                }),
              null,
              { label: "League standings read" },
              markDegraded
            )
          : Promise.resolve(null),
        selectedSeasonSummary
          ? readWithFallback(
              () =>
                db.fixture.findMany({
                  where: {
                    seasonId: selectedSeasonSummary.id,
                    sport: buildPrimarySportRelationFilter(),
                  },
                  orderBy: [{ startsAt: "asc" }],
                  take: 160,
                  include: fixtureInclude({ includeOdds: false }),
                }),
              [],
              { label: "League season fixtures read" },
              markDegraded
            )
          : Promise.resolve([]),
        readWithFallback(
          () =>
            db.fixture.findMany({
              where: {
                leagueId: baseLeague.id,
                sport: buildPrimarySportRelationFilter(),
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
          [],
          { label: "League odds fixtures read" },
          markDegraded
        ),
      ]);

      const flags = await getPublicSurfaceFlags();
      const league = {
        ...baseLeague,
        selectedSeasonRecord,
        seasonFixtures,
        oddsFixtures,
      };
      const seasonFixturesSorted = sortFixturesAsc(league.seasonFixtures || []);
      const seasonSummary = league.selectedSeasonRecord
        ? {
            ...toSeasonSummary(league.selectedSeasonRecord),
            standings: league.selectedSeasonRecord.standings || [],
          }
        : null;
      const standingsTable = buildStandingTable({
        teams: league.teams,
        standings: seasonSummary?.standings || [],
        fixtures: seasonFixturesSorted,
        view: standingsView,
      });
      const liveAndUpcomingFixtures = seasonFixturesSorted.filter((fixture) =>
        ["LIVE", "SCHEDULED"].includes(fixture.status)
      );
      const recentResults = sortFixturesDesc(
        seasonFixturesSorted.filter((fixture) =>
          ["FINISHED", "POSTPONED", "CANCELLED"].includes(fixture.status)
        )
      );
      const archiveSeasons = league.seasons.map(toSeasonSummary);
      const competitionOddsFallback = buildFallbackCompetitionBettingExperience(
        { ...league, fixtures: league.oddsFixtures, oddsFixtures: league.oddsFixtures },
        {
          locale,
          viewerTerritory,
          flags,
        }
      );
      const competitionOdds = await readWithFallback(
        () =>
          buildCompetitionBettingExperience(
            { ...league, fixtures: league.oddsFixtures, oddsFixtures: league.oddsFixtures },
            {
              locale,
              viewerTerritory,
              flags,
            }
          ),
        competitionOddsFallback,
        { label: "League odds experience read" },
        markDegraded
      );

      return {
        ...league,
        degraded,
        country:
          league.countryRecord?.name || league.country || league.competition?.country?.name || null,
        seasons: archiveSeasons,
        selectedSeason: seasonSummary,
        archiveSeasons,
        seasonFixtures: seasonFixturesSorted,
        fixtures: liveAndUpcomingFixtures.slice(0, 12),
        upcomingFixtures: liveAndUpcomingFixtures.slice(0, 12),
        recentResults: recentResults.slice(0, 12),
        fixtureSummary: summarizeFixtureStates(seasonFixturesSorted),
        standingsTable,
        competitionOdds,
      };
    }
  );
}

export async function getLeagueMetadataSummary(reference) {
  const referenceWhere = buildReferenceWhere(reference, ["id", "code", "externalRef"]);
  if (!referenceWhere) {
    return null;
  }

  return safeDataRead(
    () =>
      db.league.findFirst({
        where: {
          AND: [referenceWhere, { sport: buildPrimarySportRelationFilter() }],
        },
        select: {
          id: true,
          code: true,
          name: true,
          country: true,
          sport: {
            select: {
              name: true,
            },
          },
          competition: {
            select: {
              sport: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    null,
    { label: "League metadata read" }
  );
}

const getTeamDirectoryCached = unstable_cache(
  async () =>
    safeDataRead(
      async () => {
        const teams = await db.team.findMany({
          where: {
            league: {
              is: {
                sport: buildPrimarySportRelationFilter(),
              },
            },
          },
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
  await ensureStableBackendData();
  return observeCachedOperation("coreui:teams", () => getTeamDirectoryCached(), {
    route: "/teams",
    revalidateSeconds: 300,
    surface: "teams",
  });
}

export async function getTeamDetail(
  reference,
  {
    locale = "en",
    viewerTerritory,
    competitionRef,
    seasonRef,
    standingsView = "overall",
    includeExperience = false,
  } = {}
) {
  await ensureCatalogBackedData();
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
      safeDataRead(
        async () => {
          const recentWindow = new Date();
          recentWindow.setUTCDate(recentWindow.getUTCDate() - 1);

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
                where: { scope: "OVERALL" },
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
                          sport: true,
                        },
                      },
                      league: {
                        include: {
                          countryRecord: true,
                          sport: true,
                        },
                      },
                    },
                  },
                },
              },
              homeFor: {
                orderBy: { startsAt: "desc" },
                take: 18,
                include: fixtureInclude({ includeOdds: false }),
              },
              awayFor: {
                orderBy: { startsAt: "desc" },
                take: 18,
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

          const allRecentFixtures = dedupeFixtures([...team.homeFor, ...team.awayFor]);
          const linkedCompetitions = buildLinkedCompetitions(team);
          const selectedCompetitionSummary = pickSelectedCompetition(linkedCompetitions, competitionRef);
          const selectedCompetitionWhere = [];

          if (selectedCompetitionSummary?.leagueId) {
            selectedCompetitionWhere.push({ id: selectedCompetitionSummary.leagueId });
          }

          if (selectedCompetitionSummary?.code) {
            selectedCompetitionWhere.push({ code: selectedCompetitionSummary.code });
          }

          const selectedLeague = selectedCompetitionWhere.length
            ? await db.league.findFirst({
                where: {
                  OR: selectedCompetitionWhere,
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
              })
            : null;
          const selectedSeasonSummary = pickSelectedSeason(selectedLeague?.seasons || [], seasonRef);
          const [selectedSeasonRecord, selectedSeasonFixtures, competitionOddsFixtures] = await Promise.all([
            selectedSeasonSummary
              ? db.season.findUnique({
                  where: {
                    id: selectedSeasonSummary.id,
                  },
                  include: {
                    standings: {
                      where: { scope: "OVERALL" },
                      orderBy: { position: "asc" },
                      include: {
                        team: true,
                      },
                    },
                  },
                })
              : Promise.resolve(null),
            selectedSeasonSummary
              ? db.fixture.findMany({
                  where: {
                    seasonId: selectedSeasonSummary.id,
                    OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
                  },
                  orderBy: [{ startsAt: "asc" }],
                  take: 120,
                  include: fixtureInclude({ includeOdds: false }),
                })
              : Promise.resolve([]),
            selectedLeague
              ? db.fixture.findMany({
                  where: {
                    leagueId: selectedLeague.id,
                    OR: [{ status: "LIVE" }, { startsAt: { gte: recentWindow } }],
                  },
                  orderBy: [{ startsAt: "asc" }],
                  take: 12,
                  include: fixtureInclude({
                    includeOdds: true,
                    oddsTake: 12,
                    includeBroadcast: true,
                  }),
                })
              : Promise.resolve([]),
          ]);

          return {
            ...team,
            allRecentFixtures,
            linkedCompetitions,
            selectedCompetitionSummary,
            selectedLeague,
            selectedSeasonRecord,
            selectedSeasonFixtures,
            competitionOddsFixtures,
          };
        },
        null
      )
  ).then(async (team) => {
    if (!team) {
      return null;
    }

    const {
      allRecentFixtures,
      competitionOddsFixtures,
      linkedCompetitions,
      selectedCompetitionSummary,
      selectedLeague,
      selectedSeasonFixtures,
      selectedSeasonRecord,
      ...baseTeam
    } = team;
    const fallbackFixtures = sortFixturesDesc(allRecentFixtures || []);
    const seasonFixtures = sortFixturesAsc(selectedSeasonFixtures || []);
    const contextualFixtures = seasonFixtures.length ? seasonFixtures : fallbackFixtures;
    const selectedSeason = selectedSeasonRecord
      ? {
          id: selectedSeasonRecord.id,
          name: selectedSeasonRecord.name,
          externalRef: selectedSeasonRecord.externalRef,
          startDate: selectedSeasonRecord.startDate,
          endDate: selectedSeasonRecord.endDate,
          isCurrent: selectedSeasonRecord.isCurrent,
          fixtureCount: seasonFixtures.length,
          standingCount: selectedSeasonRecord.standings?.length || 0,
          standings: selectedSeasonRecord.standings || [],
        }
      : null;
    const archiveSeasons = selectedLeague?.seasons?.map(toSeasonSummary) || [];
    const selectedCompetition = selectedLeague
      ? {
          id: selectedLeague.id,
          leagueId: selectedLeague.id,
          competitionId: selectedLeague.competitionId,
          code: selectedLeague.code,
          name: selectedLeague.name,
          country:
            selectedLeague.countryRecord?.name ||
            selectedLeague.country ||
            selectedLeague.competition?.country?.name ||
            null,
          countryRecord: selectedLeague.countryRecord || selectedLeague.competition?.country || null,
          sport: selectedLeague.sport || selectedLeague.competition?.sport || null,
          isCurrent: Boolean(selectedSeason?.isCurrent),
        }
      : selectedCompetitionSummary;
    const standingsTable = buildStandingTable({
      teams: selectedLeague?.teams || [baseTeam],
      standings: selectedSeason?.standings || [],
      fixtures: contextualFixtures,
      view: standingsView,
    });
    const competitionOdds =
      includeExperience && selectedLeague
        ? await buildCompetitionBettingExperience(
            {
              ...selectedLeague,
              fixtures: competitionOddsFixtures,
              oddsFixtures: competitionOddsFixtures,
            },
            {
              locale,
              viewerTerritory,
              flags: await getPublicSurfaceFlags(),
            }
          )
        : null;

    return {
      ...baseTeam,
      sport: selectedCompetition?.sport || baseTeam.league?.sport || baseTeam.competition?.sport || null,
      country:
        selectedCompetition?.country ||
        baseTeam.league?.countryRecord?.name ||
        baseTeam.competition?.country?.name ||
        baseTeam.league?.country ||
        null,
      fixtures: contextualFixtures.slice(0, 12),
      seasonFixtures,
      upcomingFixtures: sortFixturesAsc(
        contextualFixtures.filter((fixture) => ["LIVE", "SCHEDULED"].includes(fixture.status))
      ).slice(0, 8),
      recentResults: sortFixturesDesc(
        contextualFixtures.filter((fixture) =>
          ["FINISHED", "POSTPONED", "CANCELLED"].includes(fixture.status)
        )
      ).slice(0, 8),
      fixtureSummary: summarizeFixtureStates(contextualFixtures),
      roster: buildRoster(baseTeam.lineupEntries, baseTeam.fixtureParticipants),
      linkedCompetitions,
      selectedCompetition,
      selectedSeason,
      seasons: archiveSeasons,
      archiveSeasons,
      standingsTable,
      competitionOdds,
    };
  });
}

export async function getFixtureDetail(
  reference,
  { locale = "en", viewerTerritory } = {}
) {
  await ensureLiveBackendData();
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
      const fixture = await safeDataRead(
        () => {
          return db.fixture.findFirst({
            where: {
              AND: [
                { OR: [{ id: reference }, { externalRef: reference }] },
                { sport: buildPrimarySportRelationFilter() },
              ],
            },
            include: {
              league: true,
              season: true,
              homeTeam: true,
              awayTeam: true,
              resultSnapshot: true,
              incidents: {
                orderBy: [{ minute: "asc" }, { sortOrder: "asc" }],
                include: {
                  team: true,
                  player: true,
                  secondaryPlayer: true,
                },
              },
              lineups: {
                orderBy: [{ side: "asc" }, { sortOrder: "asc" }],
                include: {
                  team: true,
                  player: true,
                },
              },
              statistics: {
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                include: {
                  team: true,
                },
              },
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
      const bettingExperience = await buildFixtureBettingExperience(fixture, {
        locale,
        viewerTerritory,
        flags,
      });

      return {
        ...fixture,
        ...bettingExperience,
      };
    }
  );
}
