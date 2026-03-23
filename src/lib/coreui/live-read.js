import { db } from "../db";
import {
  buildFeedRefreshProfile,
  buildFixtureDetailModules,
  buildFixtureWindowSummary,
  sortFixturesForLiveFeed,
} from "./live-detail";

const LIVE_STATUS_FILTERS = ["ALL", "LIVE", "FINISHED", "SCHEDULED"];
const RESULT_STATUS_FILTERS = ["ALL", "FINISHED", "POSTPONED", "CANCELLED"];
const TERMINAL_STATUSES = ["FINISHED", "POSTPONED", "CANCELLED"];
const RESULTS_WINDOW_DAYS = 5;

function addHours(date, amount) {
  const next = new Date(date);
  next.setHours(next.getHours() + amount);
  return next;
}

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

async function safely(query, fallback) {
  try {
    return await query();
  } catch (error) {
    return fallback;
  }
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

function buildFixtureInclude() {
  return {
    league: true,
    season: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
  };
}

function buildFixtureDetailInclude() {
  return {
    league: true,
    season: true,
    homeTeam: true,
    awayTeam: true,
    resultSnapshot: true,
    oddsMarkets: {
      include: { selections: true },
      orderBy: [{ bookmaker: "asc" }, { marketType: "asc" }],
      take: 8,
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

function buildBoardGroups(fixtures) {
  const groups = fixtures.reduce((accumulator, fixture) => {
    const country = fixture.league?.country || "International";
    const leagueCode = fixture.league?.code || fixture.league?.id || "unknown-league";
    const key = `${country}::${leagueCode}`;

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        country,
        leagueCode,
        leagueName: fixture.league?.name || "Competition",
        fixtures: [],
      });
    }

    accumulator.get(key).fixtures.push(fixture);
    return accumulator;
  }, new Map());

  return [...groups.values()].sort((left, right) => {
    const countryDifference = left.country.localeCompare(right.country);
    if (countryDifference !== 0) {
      return countryDifference;
    }

    return left.leagueName.localeCompare(right.leagueName);
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

export async function getLiveMatchdayFeed({ status, leagueCode, date } = {}) {
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
      include: buildFixtureInclude(),
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

  return {
    fixtures: sortedFixtures,
    groups: buildBoardGroups(sortedFixtures),
    selectedStatus,
    selectedLeague,
    selectedDate: selectedDate.toISOString().slice(0, 10),
    statusOptions: LIVE_STATUS_FILTERS.map((entry) => ({
      value: entry,
      count: entry === "ALL" ? fixtures.length : fixtures.filter((fixture) => fixture.status === entry).length,
    })),
    leaguePivots,
    summary: buildFixtureWindowSummary(fixtures),
    refresh: buildFeedRefreshProfile(sortedFixtures),
    surfaceState: buildSurfaceState(fixtures, degraded),
  };
}

export async function getResultsFeed({ status, leagueCode } = {}) {
  const fixtures = await safely(
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
      count: entry === "ALL" ? fixtures.length : fixtures.filter((fixture) => fixture.status === entry).length,
    })),
    leaguePivots,
    summary: buildFixtureWindowSummary(fixtures),
  };
}

export async function getLiveMatchDetail(reference) {
  return safely(async () => {
    const fixture = await db.fixture.findFirst({
      where: {
        OR: [{ id: reference }, { externalRef: reference }],
      },
      include: buildFixtureDetailInclude(),
    });

    if (!fixture) {
      return null;
    }

    const detail = buildFixtureDetailModules(fixture);

    return {
      ...fixture,
      detail,
    };
  }, null);
}
