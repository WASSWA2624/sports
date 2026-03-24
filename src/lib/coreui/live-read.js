import { getShellChromeContent } from "../control-plane";
import { safeDataRead } from "../data-access";
import { db } from "../db";
import { observeOperation } from "../operations";
import { getPlatformPublicSnapshotData } from "../platform/env";
import { buildGroupStandingsPreview, buildBestOddsCards, buildBoardGroupSummary, buildCompletedFixtureSummary, buildPredictionCards } from "./live-board";
import { buildStandingTable } from "./competition-standings";
import { buildFixtureBettingExperience } from "./odds-experience";
import { getPublicSurfaceFlags } from "./feature-flags";
import {
  buildFeedRefreshProfile,
  buildFixtureDetailModules,
  buildFixtureWindowSummary,
  sortFixturesForLiveFeed,
} from "./live-detail";
import { DEFAULT_MARKET_GEO, getGeoLabel, isGeoAllowed, normalizeGeo } from "./route-context";

const LIVE_STATUS_FILTERS = ["ALL", "LIVE", "FINISHED", "SCHEDULED"];
const RESULT_STATUS_FILTERS = ["ALL", "FINISHED", "POSTPONED", "CANCELLED"];
const TERMINAL_STATUSES = ["FINISHED", "POSTPONED", "CANCELLED"];
const RESULTS_WINDOW_DAYS = 5;

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function normalizeSearchValue(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeFilter(value, allowedValues, fallback) {
  const normalized = String(normalizeSearchValue(value) || fallback).toUpperCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function buildFixtureInclude({ includeOdds = false } = {}) {
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
      orderBy: [{ bookmaker: "asc" }, { marketType: "asc" }],
      take: 8,
    };
  }

  return include;
}

function buildFixtureDetailInclude() {
  return {
    sport: true,
    league: {
      include: {
        countryRecord: true,
      },
    },
    season: true,
    venueRecord: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
    oddsMarkets: {
      include: { selections: true },
      orderBy: [{ bookmaker: "asc" }, { marketType: "asc" }],
      take: 8,
    },
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
    broadcastChannels: {
      orderBy: [{ territory: "asc" }, { name: "asc" }],
    },
    participants: {
      orderBy: [{ sortOrder: "asc" }],
      include: {
        team: true,
        player: true,
        official: true,
      },
    },
    h2hSnapshots: {
      orderBy: [{ capturedAt: "desc" }],
      take: 4,
    },
  };
}

function buildLeaguePivots(fixtures) {
  const counts = fixtures.reduce((accumulator, fixture) => {
    const leagueCode = fixture.league?.code;
    if (!leagueCode) {
      return accumulator;
    }

    if (!accumulator.has(leagueCode)) {
      accumulator.set(leagueCode, {
        code: leagueCode,
        label: fixture.league.name,
        count: 0,
      });
    }

    accumulator.get(leagueCode).count += 1;
    return accumulator;
  }, new Map());

  return [...counts.values()].sort((left, right) => {
    const countDifference = right.count - left.count;
    if (countDifference !== 0) {
      return countDifference;
    }

    return left.label.localeCompare(right.label);
  });
}

function normalizeLeagueFilter(value, pivots) {
  const requested = normalizeSearchValue(value);
  if (!requested) {
    return "all";
  }

  const normalized = String(requested).toUpperCase();
  return pivots.some((pivot) => pivot.code === normalized) ? normalized : "all";
}

function normalizeBoardDate(dateValue) {
  const candidate = normalizeSearchValue(dateValue);
  if (!candidate) {
    return startOfDay(new Date());
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

function buildGroupTeamPool(fixtures, standings) {
  const teams = new Map();

  for (const standing of standings || []) {
    if (standing?.team?.id) {
      teams.set(standing.team.id, standing.team);
    }
  }

  for (const fixture of fixtures || []) {
    if (fixture?.homeTeam?.id) {
      teams.set(fixture.homeTeam.id, fixture.homeTeam);
    }

    if (fixture?.awayTeam?.id) {
      teams.set(fixture.awayTeam.id, fixture.awayTeam);
    }
  }

  return [...teams.values()];
}

function buildBoardGroups(fixtures, standingsBySeasonId, locale) {
  const groups = fixtures.reduce((accumulator, fixture) => {
    const country = fixture.league?.country || null;
    const leagueCode = fixture.league?.code || fixture.league?.id || "unknown-league";
    const key = `${country || "unknown-country"}::${leagueCode}`;

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        country,
        leagueId: fixture.leagueId || null,
        leagueCode,
        leagueName: fixture.league?.name || null,
        seasonId: fixture.seasonId || null,
        competitionId: fixture.competitionId || null,
        fixtures: [],
      });
    }

    accumulator.get(key).fixtures.push(fixture);
    return accumulator;
  }, new Map());

  return [...groups.values()]
    .map((group) => {
      const groupStandings = standingsBySeasonId.get(group.seasonId) || [];
      const teams = buildGroupTeamPool(group.fixtures, groupStandings);

      return {
        ...group,
        summary: buildBoardGroupSummary(group.fixtures),
        completedSummary: buildCompletedFixtureSummary(group.fixtures, locale),
        standingsPreview: buildGroupStandingsPreview({
          fixtures: group.fixtures,
          standings: groupStandings,
          teams,
        }),
      };
    })
    .sort((left, right) => {
      const countryDifference = (left.country || "").localeCompare(right.country || "");
      if (countryDifference !== 0) {
        return countryDifference;
      }

      return (left.leagueName || "").localeCompare(right.leagueName || "");
    });
}

function buildSurfaceState(fixtures, degraded) {
  const liveFixtures = fixtures.filter((fixture) => fixture.status === "LIVE");
  const staleFixtures = liveFixtures.filter((fixture) => {
    if (!fixture.lastSyncedAt) {
      return true;
    }

    return Date.now() - new Date(fixture.lastSyncedAt).getTime() > 1000 * 60 * 8;
  });

  return {
    degraded,
    stale: staleFixtures.length > 0,
    staleCount: staleFixtures.length,
  };
}

function buildStandingsBySeasonId(standings = []) {
  return standings.reduce((accumulator, standing) => {
    if (!standing?.seasonId) {
      return accumulator;
    }

    if (!accumulator.has(standing.seasonId)) {
      accumulator.set(standing.seasonId, []);
    }

    accumulator.get(standing.seasonId).push(standing);
    return accumulator;
  }, new Map());
}

function hasStoredScore(fixture) {
  return Number.isFinite(fixture?.resultSnapshot?.homeScore) && Number.isFinite(fixture?.resultSnapshot?.awayScore);
}

function sortFixturesNewest(fixtures = []) {
  return [...fixtures].sort(
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
  );
}

function sortFixturesOldest(fixtures = []) {
  return [...fixtures].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );
}

function orientMatchupScore(fixture, homeTeamId, awayTeamId) {
  if (!hasStoredScore(fixture)) {
    return null;
  }

  if (fixture.homeTeamId === homeTeamId && fixture.awayTeamId === awayTeamId) {
    return {
      homeScore: fixture.resultSnapshot.homeScore,
      awayScore: fixture.resultSnapshot.awayScore,
    };
  }

  if (fixture.homeTeamId === awayTeamId && fixture.awayTeamId === homeTeamId) {
    return {
      homeScore: fixture.resultSnapshot.awayScore,
      awayScore: fixture.resultSnapshot.homeScore,
    };
  }

  return null;
}

function getOfficialPriority(entry) {
  const role = String(entry?.role || entry?.official?.role || "").toLowerCase();

  if (role.includes("referee") && !role.includes("assistant")) {
    return 0;
  }

  if (role.includes("assistant")) {
    return 2;
  }

  if (role.includes("fourth")) {
    return 3;
  }

  return 1;
}

export function buildFixtureRefereeSummary(participants = []) {
  const officials = (participants || [])
    .filter((entry) => entry?.official)
    .sort((left, right) => getOfficialPriority(left) - getOfficialPriority(right));
  const primary = officials[0];

  if (!primary?.official) {
    return null;
  }

  return {
    name: primary.official.name,
    role: primary.role || primary.official.role || null,
    countryName: primary.official.countryName || null,
  };
}

export function buildFixtureVenueSummary(fixture) {
  const venue = fixture?.venueRecord;
  const name = venue?.name || fixture?.venue || null;

  if (!name) {
    return null;
  }

  return {
    name,
    city: venue?.city || null,
    countryName: venue?.countryName || fixture?.league?.countryRecord?.name || fixture?.league?.country || null,
    capacity: venue?.capacity || null,
  };
}

export function buildHeadToHeadSummary(
  fixtures = [],
  { homeTeamId, awayTeamId, snapshots = [] } = {}
) {
  const completedMatches = sortFixturesNewest(
    fixtures.filter(
      (fixture) => TERMINAL_STATUSES.includes(fixture?.status) && orientMatchupScore(fixture, homeTeamId, awayTeamId)
    )
  );
  const upcomingMatches = sortFixturesOldest(
    fixtures.filter((fixture) => ["LIVE", "SCHEDULED"].includes(fixture?.status))
  );
  const summary = completedMatches.reduce(
    (accumulator, fixture) => {
      const score = orientMatchupScore(fixture, homeTeamId, awayTeamId);
      if (!score) {
        return accumulator;
      }

      accumulator.totalCompleted += 1;

      if (score.homeScore > score.awayScore) {
        accumulator.homeWins += 1;
      } else if (score.homeScore < score.awayScore) {
        accumulator.awayWins += 1;
      } else {
        accumulator.draws += 1;
      }

      return accumulator;
    },
    { totalCompleted: 0, homeWins: 0, awayWins: 0, draws: 0 }
  );

  return {
    ...summary,
    completedMatches: completedMatches.slice(0, 6),
    upcomingMatches: upcomingMatches.slice(0, 3),
    latestSnapshotAt: snapshots[0]?.capturedAt || null,
  };
}

function buildMatchCentre(fixture, { seasonFixtures = [], standings = [], standingsView = "overall", headToHeadFixtures = [] } = {}) {
  const standingsTable = buildStandingTable({
    teams: [fixture.homeTeam, fixture.awayTeam],
    standings,
    fixtures: seasonFixtures,
    view: standingsView,
  });
  const focusTeamIds = [fixture.homeTeamId, fixture.awayTeamId].filter(Boolean);

  return {
    standingsTable,
    focusedRows: standingsTable.rows.filter((row) => focusTeamIds.includes(row.team.id)),
    h2h: buildHeadToHeadSummary(headToHeadFixtures, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      snapshots: fixture.h2hSnapshots,
    }),
    venue: buildFixtureVenueSummary(fixture),
    referee: buildFixtureRefereeSummary(fixture.participants),
  };
}

function rankAffiliateLink(link, targetGeo) {
  let score = 0;
  const linkGeo = normalizeGeo(link?.territory, DEFAULT_MARKET_GEO);

  if (linkGeo === targetGeo) {
    score += 100;
  } else if (linkGeo === DEFAULT_MARKET_GEO) {
    score += 20;
  }

  if (link?.isDefault) {
    score += 10;
  }

  score += Math.max(0, 200 - Number(link?.priority || 100));
  return score;
}

function resolveAffiliateLink(links = [], targetGeo, { bookmakerId, bookmakerName } = {}) {
  const candidates = links
    .filter((link) => {
      if (bookmakerId && link.bookmakerId === bookmakerId) {
        return true;
      }

      if (
        bookmakerName &&
        [link.bookmaker?.name, link.bookmaker?.shortName, link.bookmaker?.code]
          .filter(Boolean)
          .some((value) => value === bookmakerName)
      ) {
        return true;
      }

      return !bookmakerId && !bookmakerName;
    })
    .sort((left, right) => rankAffiliateLink(right, targetGeo) - rankAffiliateLink(left, targetGeo));

  return candidates[0] || null;
}

function buildAffiliateCallToAction(primaryLink, platform, locale, boardGeo) {
  if (primaryLink) {
    return {
      href: primaryLink.destinationUrl || primaryLink.fallbackUrl || null,
      external: true,
      bookmaker: primaryLink.bookmaker?.shortName || primaryLink.bookmaker?.name || null,
      partner:
        primaryLink.bookmaker?.code ||
        primaryLink.bookmaker?.shortName ||
        primaryLink.bookmaker?.name ||
        null,
    };
  }

  if (platform?.affiliate?.partnerCodes?.length || platform?.affiliate?.primaryPartner) {
    return {
      href: `/${locale}/affiliates`,
      external: false,
      bookmaker: null,
      partner: platform.affiliate.primaryPartner || platform.affiliate.partnerCodes[0] || null,
      geo: boardGeo,
    };
  }

  return null;
}

async function getLiveBoardMonetization({ locale, viewerTerritory, selectedDate, fixtures }) {
  const boardGeo = normalizeGeo(viewerTerritory, DEFAULT_MARKET_GEO);
  const competitionIds = [...new Set(fixtures.map((fixture) => fixture.competitionId).filter(Boolean))];
  const predictionWindow = {
    gte: startOfDay(selectedDate),
    lte: endOfDay(selectedDate),
  };
  const [platform, shellChrome, predictions, affiliateLinks] = await Promise.all([
    getPlatformPublicSnapshotData(),
    safeDataRead(() => getShellChromeContent(locale), {
      adSlot: null,
      consentText: null,
      shellModuleMap: {},
    }),
    safeDataRead(
      () =>
        db.predictionRecommendation.findMany({
          where: {
            isPublished: true,
            OR: [
              {
                fixture: {
                  is: {
                    startsAt: predictionWindow,
                  },
                },
              },
              competitionIds.length ? { competitionId: { in: competitionIds } } : undefined,
            ].filter(Boolean),
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
          take: 18,
          orderBy: [{ confidence: "desc" }, { edgeScore: "desc" }, { publishedAt: "desc" }],
          include: {
            fixture: {
              include: {
                homeTeam: true,
                awayTeam: true,
                league: true,
              },
            },
            competition: true,
            bookmaker: true,
          },
        }),
      []
    ),
    safeDataRead(
      () =>
        db.affiliateLink.findMany({
          where: {
            isActive: true,
            OR: [{ territory: null }, { territory: boardGeo }, { territory: DEFAULT_MARKET_GEO }],
          },
          orderBy: [{ isDefault: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
          include: {
            bookmaker: true,
          },
          take: 64,
        }),
      []
    ),
  ]);

  const predictionCards = buildPredictionCards(predictions, { locale });
  const attachCta = (entry) => {
    const affiliateLink = resolveAffiliateLink(affiliateLinks, boardGeo, {
      bookmakerId: entry.bookmakerId,
      bookmakerName: entry.bookmaker,
    });

    return {
      ...entry,
      ctaHref: affiliateLink?.destinationUrl || affiliateLink?.fallbackUrl || null,
      ctaExternal: Boolean(affiliateLink),
    };
  };
  const topPicks = predictionCards
    .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
    .slice(0, 3)
    .map(attachCta);
  const valueBets = [...predictionCards]
    .sort((left, right) => (right.edgeScore || 0) - (left.edgeScore || 0))
    .filter((entry) => entry.edgeScore != null)
    .slice(0, 3)
    .map(attachCta);
  const bestOdds = buildBestOddsCards(fixtures, { locale })
    .slice(0, 3)
    .map(attachCta);
  const primaryAffiliateLink = resolveAffiliateLink(affiliateLinks, boardGeo);
  const adSource = shellChrome?.adSlot?.isEnabled === false ? null : shellChrome?.adSlot;
  const funnelActions = (platform?.funnel?.actions || []).filter(
    (action) => action.url && isGeoAllowed(boardGeo, action.enabledGeos)
  );

  return {
    geo: boardGeo,
    geoLabel: getGeoLabel(boardGeo),
    topPicks,
    valueBets,
    bestOdds,
    affiliate: buildAffiliateCallToAction(primaryAffiliateLink, platform, locale, boardGeo),
    bookmakers:
      platform?.affiliate?.bookmakerByGeo?.[boardGeo] ||
      platform?.affiliate?.bookmakerByGeo?.[DEFAULT_MARKET_GEO] ||
      [],
    funnelActions,
    adInsert:
      adSource || platform?.ads?.inlineBoardSlot
        ? {
            placement: platform?.ads?.inlineBoardSlot || adSource?.placement || null,
            copy: adSource?.copy || null,
            size: adSource?.size || null,
            ctaHref: adSource?.ctaUrl || null,
            ctaLabel: adSource?.ctaLabel || null,
          }
        : null,
  };
}

export async function getLiveMatchdayFeed({
  locale = "en",
  status,
  leagueCode,
  date,
  viewerTerritory,
} = {}) {
  return observeOperation(
    {
      metric: "live_surface",
      subject: "matchday_feed",
      route: "/live",
      category: "route_latency",
      statusFromResult(result) {
        return result?.surfaceState?.degraded ? "degraded" : "ok";
      },
      metadata(result) {
        return {
          locale,
          selectedStatus: result?.selectedStatus || null,
          selectedLeague: result?.selectedLeague || null,
          fixtureCount: result?.fixtures?.length || 0,
          staleCount: result?.surfaceState?.staleCount || 0,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    async () => {
      const selectedDate = normalizeBoardDate(date);
      let degraded = false;
      let fixtures = [];

      try {
        fixtures = await db.fixture.findMany({
          where: {
            startsAt: {
              gte: startOfDay(selectedDate),
              lte: endOfDay(selectedDate),
            },
          },
          orderBy: [{ startsAt: "asc" }],
          take: 120,
          include: buildFixtureInclude({ includeOdds: true }),
        });
      } catch (error) {
        degraded = true;
      }

      const selectedStatus = normalizeFilter(status, LIVE_STATUS_FILTERS, "ALL");
      const statusFiltered =
        selectedStatus === "ALL"
          ? fixtures
          : fixtures.filter((fixture) => fixture.status === selectedStatus);

      const leaguePivots = buildLeaguePivots(statusFiltered);
      const selectedLeague = normalizeLeagueFilter(leagueCode, leaguePivots);
      const leagueFiltered =
        selectedLeague === "all"
          ? statusFiltered
          : statusFiltered.filter((fixture) => fixture.league?.code === selectedLeague);
      const sortedFixtures = sortFixturesForLiveFeed(leagueFiltered);
      const seasonIds = [...new Set(sortedFixtures.map((fixture) => fixture.seasonId).filter(Boolean))];
      const standings = seasonIds.length
        ? await safeDataRead(
            () =>
              db.standing.findMany({
                where: {
                  seasonId: { in: seasonIds },
                  scope: "OVERALL",
                },
                orderBy: [{ position: "asc" }],
                include: {
                  team: true,
                },
              }),
            []
          )
        : [];
      const standingsBySeasonId = buildStandingsBySeasonId(standings);
      const [monetization, flags] = await Promise.all([
        getLiveBoardMonetization({
          locale,
          viewerTerritory,
          selectedDate,
          fixtures: sortedFixtures,
        }),
        getPublicSurfaceFlags(),
      ]);

      return {
        fixtures: sortedFixtures,
        groups: buildBoardGroups(sortedFixtures, standingsBySeasonId, locale),
        selectedStatus,
        selectedLeague,
        selectedDate: selectedDate.toISOString().slice(0, 10),
        statusOptions: LIVE_STATUS_FILTERS.map((entry) => ({
          value: entry,
          count:
            entry === "ALL"
              ? fixtures.length
              : fixtures.filter((fixture) => fixture.status === entry).length,
        })),
        leaguePivots,
        summary: buildFixtureWindowSummary(fixtures),
        refresh: buildFeedRefreshProfile(sortedFixtures, locale),
        monetization,
        flags,
        surfaceState: buildSurfaceState(fixtures, degraded),
      };
    }
  );
}

export async function getResultsFeed({ locale = "en", status, leagueCode } = {}) {
  void locale;
  return observeOperation(
    {
      metric: "results_surface",
      subject: "results_feed",
      route: "/results",
      statusFromResult() {
        return "ok";
      },
      metadata(result) {
        return {
          fixtureCount: result?.fixtures?.length || 0,
          selectedStatus: result?.selectedStatus || null,
          selectedLeague: result?.selectedLeague || null,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    async () => {
      const fixtures = await safeDataRead(
        () =>
          db.fixture.findMany({
            where: {
              status: { in: TERMINAL_STATUSES },
              startsAt: { gte: addDays(new Date(), -RESULTS_WINDOW_DAYS) },
            },
            orderBy: [{ startsAt: "desc" }],
            take: 60,
            include: buildFixtureInclude(),
          }),
        []
      );

      const selectedStatus = normalizeFilter(status, RESULT_STATUS_FILTERS, "ALL");
      const statusFiltered =
        selectedStatus === "ALL"
          ? fixtures
          : fixtures.filter((fixture) => fixture.status === selectedStatus);

      const leaguePivots = buildLeaguePivots(statusFiltered);
      const selectedLeague = normalizeLeagueFilter(leagueCode, leaguePivots);
      const leagueFiltered =
        selectedLeague === "all"
          ? statusFiltered
          : statusFiltered.filter((fixture) => fixture.league?.code === selectedLeague);

      return {
        fixtures: leagueFiltered,
        selectedStatus,
        selectedLeague,
        statusOptions: RESULT_STATUS_FILTERS.map((entry) => ({
          value: entry,
          count:
            entry === "ALL"
              ? fixtures.length
              : fixtures.filter((fixture) => fixture.status === entry).length,
        })),
        leaguePivots,
        summary: buildFixtureWindowSummary(fixtures),
      };
    }
  );
}

export async function getLiveMatchDetail(
  reference,
  locale = "en",
  viewerTerritory,
  { standingsView = "overall", includeMatchCentre = false, includeExperience = true } = {}
) {
  return observeOperation(
    {
      metric: "live_surface",
      subject: "live_match_detail",
      route: `/match/${reference || ""}`,
      statusFromResult(result) {
        return result ? "ok" : "empty";
      },
      metadata(result) {
        return {
          fixture: result?.id || reference || null,
          status: result?.status || null,
          locale,
        };
      },
      eventOptions: {
        force: true,
      },
    },
    () =>
      safeDataRead(async () => {
        const fixture = await db.fixture.findFirst({
          where: {
            OR: [{ id: reference }, { externalRef: reference }],
          },
          include: buildFixtureDetailInclude(),
        });

        if (!fixture) {
          return null;
        }

        const detail = buildFixtureDetailModules(fixture, locale);
        const flags = includeExperience ? await getPublicSurfaceFlags() : null;
        const [seasonFixtures, standings, headToHeadFixtures, bettingExperience] = await Promise.all([
          includeMatchCentre
            ? db.fixture.findMany({
                where: {
                  seasonId: fixture.seasonId,
                },
                orderBy: [{ startsAt: "asc" }],
                take: 200,
                include: buildFixtureInclude(),
              })
            : Promise.resolve([]),
          includeMatchCentre
            ? db.standing.findMany({
                where: {
                  seasonId: fixture.seasonId,
                  scope: "OVERALL",
                },
                orderBy: [{ position: "asc" }],
                include: {
                  team: true,
                },
              })
            : Promise.resolve([]),
          includeMatchCentre
            ? db.fixture.findMany({
                where: {
                  id: { not: fixture.id },
                  OR: [
                    {
                      homeTeamId: fixture.homeTeamId,
                      awayTeamId: fixture.awayTeamId,
                    },
                    {
                      homeTeamId: fixture.awayTeamId,
                      awayTeamId: fixture.homeTeamId,
                    },
                  ],
                },
                orderBy: [{ startsAt: "desc" }],
                take: 12,
                include: buildFixtureInclude(),
              })
            : Promise.resolve([]),
          includeExperience
            ? buildFixtureBettingExperience(fixture, {
                locale,
                viewerTerritory,
                flags,
              })
            : Promise.resolve({}),
        ]);

        return {
          ...fixture,
          detail,
          ...bettingExperience,
          matchCentre: includeMatchCentre
            ? buildMatchCentre(fixture, {
                seasonFixtures,
                standings,
                standingsView,
                headToHeadFixtures,
              })
            : null,
        };
      }, null)
  );
}
