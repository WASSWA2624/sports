import { cache } from "react";
import { createSportsProvider } from "../sports/provider";
import { getSportsSyncConfig } from "../sports/config";
import { buildTeamSlug } from "./team-branding";

const GLOBAL_FEATURED_LEAGUE_CODES = ["EPL", "UCL", "LL", "SA", "BL1"];
const LOCALE_LEAGUE_BY_LOCALE = {
  en: "MLS",
  fr: "L1",
  sw: "TPL",
};
const TIME_FILTERS = [
  { value: "all", label: "Any time" },
  { value: "night", label: "00:00 - 05:59" },
  { value: "morning", label: "06:00 - 11:59" },
  { value: "afternoon", label: "12:00 - 17:59" },
  { value: "evening", label: "18:00 - 23:59" },
];
const DIRECTORY_DAYS_PAST = 30;
const DIRECTORY_DAYS_AHEAD = 120;
const TEAM_WINDOW_DAYS_PAST = 180;
const TEAM_WINDOW_DAYS_AHEAD = 45;
const MATCH_WINDOW_DAYS_PAST = 30;
const MATCH_WINDOW_DAYS_AHEAD = 14;
const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:59";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PROVIDER_RANGE_DAYS = 90;
const RANGE_PRESETS = [
  { value: "today", label: "Today", quick: true, navigation: { unit: "day", amount: 1 } },
  { value: "tomorrow", label: "Tomorrow", quick: true, navigation: { unit: "day", amount: 1 } },
  { value: "yesterday", label: "Yesterday", quick: true, navigation: { unit: "day", amount: 1 } },
  { value: "this-week", label: "This week", quick: true, navigation: { unit: "week", amount: 1 } },
  { value: "last-week", label: "Last week", quick: true, navigation: { unit: "week", amount: 1 } },
  { value: "next-week", label: "Next week", quick: true, navigation: { unit: "week", amount: 1 } },
  { value: "weekend", label: "This weekend", quick: false, navigation: { unit: "week", amount: 1 } },
  { value: "this-month", label: "This month", quick: true, navigation: { unit: "month", amount: 1 } },
  { value: "last-month", label: "Last month", quick: true, navigation: { unit: "month", amount: 1 } },
  { value: "next-month", label: "Next month", quick: true, navigation: { unit: "month", amount: 1 } },
  { value: "next-7-days", label: "Next 7 days", quick: true, navigation: { unit: "days", amount: 7 } },
  { value: "next-30-days", label: "Next 30 days", quick: false, navigation: { unit: "days", amount: 30 } },
  { value: "custom", label: "Custom range", quick: false, navigation: null },
];

function createProvider() {
  return createSportsProvider();
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const source = new Date(date);
  const year = source.getFullYear();
  const month = source.getMonth() + amount;
  const hours = source.getHours();
  const minutes = source.getMinutes();
  const seconds = source.getSeconds();
  const milliseconds = source.getMilliseconds();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(
    year,
    month,
    Math.min(source.getDate(), lastDayOfMonth),
    hours,
    minutes,
    seconds,
    milliseconds
  );
}

function setTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function endOfWeek(date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const parsed = new Date(year, month, day, 0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseTimeKey(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || "").trim());

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function toTimeKey(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return DEFAULT_START_TIME;
  }

  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function combineDateAndTime(dateKey, timeValue, fallbackTime = DEFAULT_START_TIME) {
  const parsedDate = parseDateKey(dateKey);
  const parsedTime = parseTimeKey(timeValue) || parseTimeKey(fallbackTime);

  if (!parsedDate || !parsedTime) {
    return null;
  }

  return setTime(parsedDate, parsedTime.hour, parsedTime.minute);
}

function normalizeTimeInput(value, fallback = DEFAULT_START_TIME) {
  const parsedTime = parseTimeKey(value) || parseTimeKey(fallback);
  return parsedTime ? `${padNumber(parsedTime.hour)}:${padNumber(parsedTime.minute)}` : fallback;
}

function normalizePreset(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return RANGE_PRESETS.some((entry) => entry.value === normalized) ? normalized : "";
}

function getPresetDefinition(value) {
  return RANGE_PRESETS.find((entry) => entry.value === value) || null;
}

function buildPresetRange(preset, now = new Date()) {
  switch (preset) {
    case "tomorrow": {
      const start = addDays(startOfDay(now), 1);
      return { start, end: endOfDay(start) };
    }
    case "yesterday": {
      const start = addDays(startOfDay(now), -1);
      return { start, end: endOfDay(start) };
    }
    case "this-week": {
      const start = startOfWeek(now);
      return { start, end: endOfWeek(now) };
    }
    case "last-week": {
      const start = addDays(startOfWeek(now), -7);
      return { start, end: endOfWeek(start) };
    }
    case "next-week": {
      const start = addDays(startOfWeek(now), 7);
      return { start, end: endOfWeek(start) };
    }
    case "weekend": {
      const start = addDays(startOfWeek(now), 5);
      return { start, end: endOfDay(addDays(start, 1)) };
    }
    case "this-month": {
      const start = startOfMonth(now);
      return { start, end: endOfMonth(start) };
    }
    case "last-month": {
      const start = startOfMonth(addMonths(now, -1));
      return { start, end: endOfMonth(start) };
    }
    case "next-month": {
      const start = startOfMonth(addMonths(now, 1));
      return { start, end: endOfMonth(start) };
    }
    case "next-7-days": {
      const start = startOfDay(now);
      return { start, end: endOfDay(addDays(start, 6)) };
    }
    case "next-30-days": {
      const start = startOfDay(now);
      return { start, end: endOfDay(addDays(start, 29)) };
    }
    case "today":
    default: {
      const start = startOfDay(now);
      return { start, end: endOfDay(start) };
    }
  }
}

function normalizeRange(range) {
  if (!range?.start || !range?.end) {
    return buildPresetRange("today");
  }

  if (range.start.getTime() <= range.end.getTime()) {
    return range;
  }

  return {
    start: range.end,
    end: range.start,
  };
}

function rangesMatch(left, right) {
  return (
    left?.start?.getTime() === right?.start?.getTime() &&
    left?.end?.getTime() === right?.end?.getTime()
  );
}

function getRangeDaySpan(range) {
  return Math.max(
    1,
    Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / DAY_MS) + 1
  );
}

function shiftRange(range, direction, presetValue = "custom") {
  const presetDefinition = getPresetDefinition(presetValue);

  if (presetDefinition?.navigation?.unit === "month") {
    return {
      start: addMonths(range.start, direction * presetDefinition.navigation.amount),
      end: addMonths(range.end, direction * presetDefinition.navigation.amount),
    };
  }

  if (presetDefinition?.navigation?.unit === "week") {
    return {
      start: addDays(range.start, direction * presetDefinition.navigation.amount * 7),
      end: addDays(range.end, direction * presetDefinition.navigation.amount * 7),
    };
  }

  if (presetDefinition?.navigation?.unit === "days") {
    return {
      start: addDays(range.start, direction * presetDefinition.navigation.amount),
      end: addDays(range.end, direction * presetDefinition.navigation.amount),
    };
  }

  const offset = presetDefinition?.navigation?.amount || getRangeDaySpan(range);
  return {
    start: addDays(range.start, direction * offset),
    end: addDays(range.end, direction * offset),
  };
}

function buildManualRange(
  {
    date,
    startDate,
    startTime,
    endDate,
    endTime,
  },
  now = new Date()
) {
  const hasExplicitRangeValues = [date, startDate, startTime, endDate, endTime].some((value) =>
    String(value || "").trim()
  );

  if (!hasExplicitRangeValues) {
    return null;
  }

  const fallbackDate =
    toDateKey(parseDateKey(startDate) || parseDateKey(endDate) || parseDateKey(date) || now);
  const resolvedStartDate = parseDateKey(startDate) ? startDate : fallbackDate;
  const resolvedEndDate = parseDateKey(endDate) ? endDate : fallbackDate;
  const resolvedStartTime = normalizeTimeInput(startTime, DEFAULT_START_TIME);
  const resolvedEndTime = normalizeTimeInput(endTime, DEFAULT_END_TIME);
  const start = combineDateAndTime(resolvedStartDate, resolvedStartTime, DEFAULT_START_TIME);
  const end = combineDateAndTime(resolvedEndDate, resolvedEndTime, DEFAULT_END_TIME);

  if (!start || !end) {
    return null;
  }

  return normalizeRange({ start, end });
}

function matchPresetByRange(range, now = new Date()) {
  return (
    RANGE_PRESETS.filter((entry) => entry.value !== "custom").find((entry) =>
      rangesMatch(range, buildPresetRange(entry.value, now))
    )?.value || "custom"
  );
}

function buildRangeParams(range) {
  return {
    preset: "custom",
    startDate: toDateKey(range.start),
    startTime: toTimeKey(range.start),
    endDate: toDateKey(range.end),
    endTime: toTimeKey(range.end),
    date: "",
  };
}

function resolveDateRange(
  {
    date,
    preset,
    startDate,
    startTime,
    endDate,
    endTime,
  },
  now = new Date()
) {
  const normalizedPreset = normalizePreset(preset);
  const presetRange =
    normalizedPreset && normalizedPreset !== "custom" ? buildPresetRange(normalizedPreset, now) : null;
  const manualRange = buildManualRange(
    {
      date,
      startDate,
      startTime,
      endDate,
      endTime,
    },
    now
  );
  const activeRange =
    manualRange && (!presetRange || !rangesMatch(manualRange, presetRange))
      ? manualRange
      : presetRange || manualRange || buildPresetRange("today", now);
  const selectedPreset = matchPresetByRange(activeRange, now);
  const previousRange = shiftRange(activeRange, -1, selectedPreset);
  const nextRange = shiftRange(activeRange, 1, selectedPreset);

  return {
    activeRange,
    selectedPreset,
    selectedPresetLabel: getPresetDefinition(selectedPreset)?.label || "Custom range",
    selectedStartDate: toDateKey(activeRange.start),
    selectedStartTime: toTimeKey(activeRange.start),
    selectedEndDate: toDateKey(activeRange.end),
    selectedEndTime: toTimeKey(activeRange.end),
    isDefault: selectedPreset === "today",
    quickPresetOptions: RANGE_PRESETS.filter((entry) => entry.quick).map((entry) => ({
      value: entry.value,
      label: entry.label,
    })),
    presetOptions: RANGE_PRESETS.map((entry) => ({
      value: entry.value,
      label: entry.label,
    })),
    navigation: {
      previous: buildRangeParams(previousRange),
      next: buildRangeParams(nextRange),
    },
  };
}

function normalizeStatus(status) {
  const value = String(status || "all").trim().toUpperCase();
  return ["ALL", "LIVE", "SCHEDULED", "FINISHED"].includes(value) ? value : "ALL";
}

function normalizeTimeFilter(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  return TIME_FILTERS.some((entry) => entry.value === normalized) ? normalized : "all";
}

function matchesDateRange(fixture, range) {
  const kickoffTime = new Date(fixture.startsAt).getTime();

  if (Number.isNaN(kickoffTime)) {
    return false;
  }

  return kickoffTime >= range.start.getTime() && kickoffTime <= range.end.getTime();
}

function getHour(dateString) {
  return new Date(dateString).getHours();
}

function getTimeBucket(dateString) {
  const hour = getHour(dateString);

  if (hour < 6) {
    return "night";
  }

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

function formatTimeForSearch(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function matchesQuery(fixture, query) {
  if (!query) {
    return true;
  }

  const target = String(query).trim().toLowerCase();
  const haystack = [
    fixture.league.name,
    fixture.league.country,
    fixture.homeTeam.name,
    fixture.homeTeam.shortName,
    fixture.awayTeam.name,
    fixture.awayTeam.shortName,
    formatTimeForSearch(fixture.startsAt),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(target);
}

function summarize(fixtures) {
  return fixtures.reduce(
    (summary, fixture) => {
      summary.total += 1;
      summary[fixture.status] = (summary[fixture.status] || 0) + 1;
      return summary;
    },
    { total: 0, LIVE: 0, SCHEDULED: 0, FINISHED: 0 }
  );
}

function countCompetitions(fixtures) {
  return new Set(fixtures.map((fixture) => fixture.league.code)).size;
}

function applyBaseFilters(fixtures, { query, leagueCode, time }) {
  return fixtures.filter((fixture) => {
    if (leagueCode && leagueCode !== "all" && fixture.league.code !== leagueCode) {
      return false;
    }

    if (!matchesQuery(fixture, query)) {
      return false;
    }

    if (time && time !== "all" && getTimeBucket(fixture.startsAt) !== time) {
      return false;
    }

    return true;
  });
}

function fixtureSortWeight(fixture) {
  if (fixture.status === "LIVE") {
    return 0;
  }

  if (fixture.status === "SCHEDULED") {
    return 1;
  }

  return 2;
}

function groupFixtures(fixtures) {
  const grouped = fixtures.reduce((map, fixture) => {
    const kickoff = new Date(fixture.startsAt);
    const key = `${toDateKey(kickoff)}T${toTimeKey(kickoff)}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        startsAt: fixture.startsAt,
        fixtures: [],
        leagues: new Map(),
      });
    }

    const group = map.get(key);
    group.fixtures.push(fixture);
    group.leagues.set(fixture.league.code, fixture.league.name);
    return map;
  }, new Map());

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      summary: summarize(group.fixtures),
      fixtureCount: group.fixtures.length,
      leagueCount: group.leagues.size,
      leagueNames: [...group.leagues.values()].sort((left, right) => left.localeCompare(right)),
      fixtures: [...group.fixtures].sort(
        (left, right) =>
          fixtureSortWeight(left) - fixtureSortWeight(right) ||
          left.league.name.localeCompare(right.league.name) ||
          left.homeTeam.name.localeCompare(right.homeTeam.name)
      ),
    }))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function normalizeCompetitionCode(rawCode, fallbackName, fallbackExternalRef) {
  const normalized = String(rawCode || fallbackName || fallbackExternalRef || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `LEAGUE-${fallbackExternalRef || "UNKNOWN"}`;
}

function normalizeShortName(team) {
  const shortName = String(team?.shortName || "").trim();

  if (shortName) {
    return shortName;
  }

  return String(team?.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.slice(0, 1))
    .join("")
    .toUpperCase();
}

function parseMetricNumber(value) {
  const normalized = String(value ?? "").replace(/[^0-9.-]+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildStatisticPairs(entries = []) {
  const grouped = new Map();

  entries.forEach((entry, index) => {
    const key = entry.metricKey || entry.name || `metric-${index}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: entry.name || entry.metricKey || "Stat",
        home: null,
        away: null,
        order: entry.sortOrder ?? index,
      });
    }

    const group = grouped.get(key);

    if (entry.side === "HOME") {
      group.home = entry.value;
    } else if (entry.side === "AWAY") {
      group.away = entry.value;
    }
  });

  return [...grouped.values()]
    .sort((left, right) => left.order - right.order)
    .map((entry) => {
      const homeNumeric = parseMetricNumber(entry.home);
      const awayNumeric = parseMetricNumber(entry.away);
      const total = (homeNumeric || 0) + (awayNumeric || 0);
      const homeShare = total > 0 ? Math.round(((homeNumeric || 0) / total) * 100) : 50;
      const awayShare = total > 0 ? Math.round(((awayNumeric || 0) / total) * 100) : 50;

      return {
        key: entry.key,
        label: entry.label,
        home: entry.home ?? "-",
        away: entry.away ?? "-",
        homeShare,
        awayShare,
      };
    });
}

function buildTimeline(incidents = []) {
  return incidents
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .map((entry, index) => ({
      id: entry.externalRef || `${entry.incidentKey || "event"}-${index}`,
      minuteLabel:
        Number.isFinite(entry.minute)
          ? `${entry.minute}${Number.isFinite(entry.extraMinute) ? `+${entry.extraMinute}` : ""}'`
          : "Event",
      title: entry.title,
      actor: entry.player?.name || null,
      secondaryActor: entry.secondaryPlayer?.name || null,
      description: entry.description || entry.secondaryLabel || entry.title,
      featured: ["goal", "penalty", "redcard", "red_card"].includes(String(entry.incidentKey || "").toLowerCase()),
    }));
}

function buildLineups(entries = []) {
  const grouped = { home: [], away: [] };

  entries
    .filter((entry) => entry.isStarter)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .forEach((entry) => {
      const key = entry.side === "AWAY" ? "away" : "home";
      grouped[key].push({
        id: entry.externalRef || `${entry.player?.externalRef || entry.player?.name}`,
        name: entry.player?.name || "Unknown Player",
        jerseyNumber: entry.jerseyNumber || "",
      });
    });

  return {
    home: {
      formation: null,
      starters: grouped.home,
    },
    away: {
      formation: null,
      starters: grouped.away,
    },
  };
}

function buildClockMinute(fixture) {
  const state = fixture?.metadata?.state || {};
  const directMinute = Number(
    pickFirst(state.minute, state.minutes, state.current_minute, fixture.metadata?.minute)
  );

  if (Number.isFinite(directMinute)) {
    return directMinute;
  }

  const timelineMinute = fixture.incidents.reduce((largest, entry) => {
    if (!Number.isFinite(entry.minute)) {
      return largest;
    }

    return Math.max(largest, entry.minute);
  }, null);

  return Number.isFinite(timelineMinute) ? timelineMinute : null;
}

function mapTeam(team) {
  return {
    id: team?.externalRef || buildTeamSlug(team?.name || team?.shortName),
    externalRef: team?.externalRef || null,
    slug: buildTeamSlug(team?.name || team?.shortName),
    name: team?.name || "Unknown Team",
    shortName: normalizeShortName(team),
    logoUrl: team?.logoUrl || null,
  };
}

function mapFixtureToUi(fixture) {
  const startsAt =
    fixture.startsAt instanceof Date ? fixture.startsAt.toISOString() : new Date(fixture.startsAt).toISOString();

  return {
    id: fixture.externalRef || startsAt,
    externalRef: fixture.externalRef || startsAt,
    league: {
      externalRef: fixture.league?.externalRef || null,
      seasonExternalRef: fixture.season?.externalRef || null,
      code: normalizeCompetitionCode(
        fixture.league?.code,
        fixture.league?.name,
        fixture.league?.externalRef || "unknown"
      ),
      name: fixture.league?.name || "Unknown League",
      country: fixture.league?.country || null,
      seasonName: fixture.season?.name || null,
      logoUrl: fixture.league?.logoUrl || null,
    },
    round: fixture.round || fixture.roundInfo?.name || null,
    startsAt,
    status: fixture.status,
    homeTeam: mapTeam(fixture.homeTeam),
    awayTeam: mapTeam(fixture.awayTeam),
    resultSnapshot: {
      homeScore: Number.isFinite(fixture.resultSnapshot?.homeScore) ? fixture.resultSnapshot.homeScore : null,
      awayScore: Number.isFinite(fixture.resultSnapshot?.awayScore) ? fixture.resultSnapshot.awayScore : null,
      capturedAt: new Date().toISOString(),
    },
    clockMinute: buildClockMinute(fixture),
    venue: fixture.venue || null,
    referee: pickFirst(
      fixture.metadata?.referee?.name,
      fixture.metadata?.officials?.find?.((entry) => String(entry?.type || "").toLowerCase().includes("ref"))?.name,
      fixture.metadata?.referee_name
    ),
    statistics: buildStatisticPairs(fixture.statistics || []),
    lineups: buildLineups(fixture.lineups || []),
    timeline: buildTimeline(fixture.incidents || []),
  };
}

function mergeFixtures(...fixtureCollections) {
  const fixtures = new Map();

  fixtureCollections.flat().forEach((fixture) => {
    fixtures.set(String(fixture.externalRef), fixture);
  });

  return [...fixtures.values()];
}

function getLocaleLeagueCode(locale) {
  return LOCALE_LEAGUE_BY_LOCALE[String(locale || "").trim().toLowerCase()] || LOCALE_LEAGUE_BY_LOCALE.en;
}

async function fetchFixturesWindow(startDate, endDate, includeLive = true) {
  const provider = createProvider();
  const ranges = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const chunkEnd = endOfDay(
      new Date(Math.min(addDays(cursor, MAX_PROVIDER_RANGE_DAYS - 1).getTime(), endDate.getTime()))
    );
    ranges.push({
      startDate: new Date(cursor),
      endDate: chunkEnd,
    });
    cursor = addDays(startOfDay(chunkEnd), 1);
  }

  const fixtureChunks = await Promise.all(
    ranges.map((range) => provider.fetchFixtures(range))
  );
  const fixtures = mergeFixtures(...fixtureChunks);

  if (!includeLive) {
    return fixtures;
  }

  let liveFixtures = [];
  try {
    liveFixtures = await provider.fetchLivescores();
  } catch (error) {
    liveFixtures = [];
  }

  const filteredLive = liveFixtures.filter((fixture) => {
    const startsAt = fixture.startsAt instanceof Date ? fixture.startsAt : new Date(fixture.startsAt);
    return startsAt >= startDate && startsAt <= endDate;
  });

  return mergeFixtures(fixtures, filteredLive);
}

const getDirectorySnapshot = cache(async function getDirectorySnapshot() {
  const now = new Date();
  const startDate = addDays(startOfDay(now), -DIRECTORY_DAYS_PAST);
  const endDate = addDays(endOfDay(now), DIRECTORY_DAYS_AHEAD);
  const fixtures = (await fetchFixturesWindow(startDate, endDate, true)).map(mapFixtureToUi);
  const leagues = [...fixtures.reduce((map, fixture) => {
    const code = fixture.league.code;

    if (!map.has(code)) {
      map.set(code, {
        id: code,
        code,
        name: fixture.league.name,
        country: fixture.league.country,
        season: fixture.league.seasonName || "Current season",
        seasonExternalRef: fixture.league.seasonExternalRef,
        leagueExternalRef: fixture.league.externalRef,
        logoUrl: fixture.league.logoUrl || null,
        teams: new Map(),
        fixtures: [],
      });
    }

    const league = map.get(code);
    league.fixtures.push(fixture);
    league.teams.set(fixture.homeTeam.slug, fixture.homeTeam);
    league.teams.set(fixture.awayTeam.slug, fixture.awayTeam);
    return map;
  }, new Map()).values()]
    .map((league) => ({
      ...league,
      teams: [...league.teams.values()].sort((left, right) => left.name.localeCompare(right.name)),
      fixtures: [...league.fixtures].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    fixtures,
    leagues,
  };
});

async function getLeagueStandings(league) {
  if (!league?.seasonExternalRef) {
    return [];
  }

  try {
    const provider = createProvider();
    return await provider.fetchStandings({ seasonExternalRef: league.seasonExternalRef });
  } catch (error) {
    return [];
  }
}

function buildComputedForm(fixtures, teamSlug) {
  return fixtures
    .filter(
      (fixture) =>
        fixture.status === "FINISHED" &&
        (fixture.homeTeam.slug === teamSlug || fixture.awayTeam.slug === teamSlug) &&
        Number.isFinite(fixture.resultSnapshot?.homeScore) &&
        Number.isFinite(fixture.resultSnapshot?.awayScore)
    )
    .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
    .slice(0, 5)
    .map((fixture) => {
      const isHome = fixture.homeTeam.slug === teamSlug;
      const goalsFor = isHome ? fixture.resultSnapshot.homeScore : fixture.resultSnapshot.awayScore;
      const goalsAgainst = isHome ? fixture.resultSnapshot.awayScore : fixture.resultSnapshot.homeScore;

      if (goalsFor > goalsAgainst) {
        return "W";
      }

      if (goalsFor < goalsAgainst) {
        return "L";
      }

      return "D";
    });
}

function buildComputedStandings(fixtures) {
  const table = new Map();

  fixtures
    .filter(
      (fixture) =>
        fixture.status === "FINISHED" &&
        Number.isFinite(fixture.resultSnapshot?.homeScore) &&
        Number.isFinite(fixture.resultSnapshot?.awayScore)
    )
    .forEach((fixture) => {
      for (const team of [fixture.homeTeam, fixture.awayTeam]) {
        if (!table.has(team.slug)) {
          table.set(team.slug, {
            team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
          });
        }
      }

      const home = table.get(fixture.homeTeam.slug);
      const away = table.get(fixture.awayTeam.slug);
      const homeGoals = fixture.resultSnapshot.homeScore;
      const awayGoals = fixture.resultSnapshot.awayScore;

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;
      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;

      if (homeGoals > awayGoals) {
        home.won += 1;
        away.lost += 1;
        home.points += 3;
      } else if (homeGoals < awayGoals) {
        away.won += 1;
        home.lost += 1;
        away.points += 3;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  return [...table.values()]
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      const leftDifference = left.goalsFor - left.goalsAgainst;
      const rightDifference = right.goalsFor - right.goalsAgainst;
      if (rightDifference !== leftDifference) {
        return rightDifference - leftDifference;
      }

      return left.team.name.localeCompare(right.team.name);
    })
    .map((entry, index) => ({
      position: index + 1,
      team: entry.team,
      played: entry.played,
      won: entry.won,
      drawn: entry.drawn,
      lost: entry.lost,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      points: entry.points,
      form: buildComputedForm(fixtures, entry.team.slug),
    }));
}

function mapStandingsRows(rows, fixtures) {
  if (!rows.length) {
    return buildComputedStandings(fixtures);
  }

  return rows
    .filter((row) => row.scope === "OVERALL")
    .sort((left, right) => left.position - right.position)
    .map((row) => {
      const team = {
        id: row.team?.externalRef || buildTeamSlug(row.team?.name || row.team?.shortName),
        externalRef: row.team?.externalRef || null,
        slug: buildTeamSlug(row.team?.name || row.team?.shortName),
        name: row.team?.name || "Unknown Team",
        shortName: normalizeShortName(row.team),
        logoUrl: row.team?.logoUrl || null,
      };

      return {
        position: row.position,
        team,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        points: row.points,
        form: buildComputedForm(fixtures, team.slug),
      };
    });
}

function getFixtureTeamSide(fixture, teamSlug) {
  if (fixture.homeTeam.slug === teamSlug) {
    return "home";
  }

  if (fixture.awayTeam.slug === teamSlug) {
    return "away";
  }

  return null;
}

function getTeamScoreline(fixture, side) {
  if (!Number.isFinite(fixture.resultSnapshot?.homeScore) || !side) {
    return null;
  }

  return side === "home"
    ? {
        goalsFor: fixture.resultSnapshot.homeScore,
        goalsAgainst: fixture.resultSnapshot.awayScore,
      }
    : {
        goalsFor: fixture.resultSnapshot.awayScore,
        goalsAgainst: fixture.resultSnapshot.homeScore,
      };
}

function buildTeamResultLabel(fixture, side) {
  const scoreline = getTeamScoreline(fixture, side);

  if (!scoreline) {
    return null;
  }

  if (scoreline.goalsFor > scoreline.goalsAgainst) {
    return "W";
  }

  if (scoreline.goalsFor < scoreline.goalsAgainst) {
    return "L";
  }

  return "D";
}

async function fetchTeamWindowFixtures() {
  const now = new Date();
  const startDate = addDays(startOfDay(now), -TEAM_WINDOW_DAYS_PAST);
  const endDate = addDays(endOfDay(now), TEAM_WINDOW_DAYS_AHEAD);
  const fixtures = await fetchFixturesWindow(startDate, endDate, true);
  return fixtures.map(mapFixtureToUi);
}

async function fetchMatchWindowFixtures() {
  const now = new Date();
  const startDate = addDays(startOfDay(now), -MATCH_WINDOW_DAYS_PAST);
  const endDate = addDays(endOfDay(now), MATCH_WINDOW_DAYS_AHEAD);
  const fixtures = await fetchFixturesWindow(startDate, endDate, true);
  return fixtures.map(mapFixtureToUi);
}

export async function getShellDataFromProvider() {
  const directory = await getDirectorySnapshot();
  const countryGroups = [...directory.leagues.reduce((map, league) => {
    if (!map.has(league.country)) {
      map.set(league.country, {
        country: league.country,
        leagues: [],
      });
    }

    map.get(league.country).leagues.push({
      code: league.code,
      name: league.name,
      country: league.country,
      logoUrl: league.logoUrl || null,
    });
    return map;
  }, new Map()).values()];

  return {
    featuredCompetitions: directory.leagues.map((league) => ({
      code: league.code,
      name: league.name,
      country: league.country,
      logoUrl: league.logoUrl || null,
    })),
    countryGroups,
    fixtures: directory.fixtures,
  };
}

export async function getLeagueDirectoryFromProvider() {
  const directory = await getDirectorySnapshot();

  return directory.leagues.map((league) => ({
    id: league.id,
    code: league.code,
    name: league.name,
    country: league.country,
    season: league.season,
    logoUrl: league.logoUrl || null,
    seasonExternalRef: league.seasonExternalRef || null,
    leagueExternalRef: league.leagueExternalRef || null,
    teams: league.teams,
    fixtures: league.fixtures,
  }));
}

export async function getLeagueDetailFromProvider(leagueCode) {
  const leagues = await getLeagueDirectoryFromProvider();
  const league = leagues.find((entry) => entry.code === leagueCode);

  if (!league) {
    return null;
  }

  const standings = mapStandingsRows(await getLeagueStandings(league), league.fixtures);

  return {
    ...league,
    fixtureSummary: summarize(league.fixtures),
    standings,
    seasons: league.seasonExternalRef ? [{ id: league.season, name: league.season, externalRef: league.seasonExternalRef }] : [],
    selectedSeason: { id: league.season, name: league.season, externalRef: league.seasonExternalRef || null },
    archiveSeasons: [{ id: league.season, name: league.season, fixtureCount: league.fixtures.length }],
  };
}

export async function getTeamDetailFromProvider(teamSlug) {
  const normalizedSlug = buildTeamSlug(teamSlug);
  const fixtures = (await fetchTeamWindowFixtures()).filter((fixture) => getFixtureTeamSide(fixture, normalizedSlug));

  if (!fixtures.length) {
    return null;
  }

  const latestFixture = [...fixtures].sort(
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
  )[0];
  const latestSide = getFixtureTeamSide(latestFixture, normalizedSlug);
  const team = latestSide === "home" ? latestFixture.homeTeam : latestFixture.awayTeam;
  const leagues = [...new Map(fixtures.map((fixture) => [fixture.league.code, fixture.league])).values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const activeFixtures = [...fixtures]
    .filter((fixture) => fixture.status !== "FINISHED")
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const recentResults = [...fixtures]
    .filter((fixture) => fixture.status === "FINISHED")
    .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
    .slice(0, 5);
  const finishedFixtures = fixtures.filter((fixture) => fixture.status === "FINISHED");
  const record = finishedFixtures.reduce(
    (summary, fixture) => {
      const side = getFixtureTeamSide(fixture, normalizedSlug);
      const scoreline = getTeamScoreline(fixture, side);

      if (!scoreline) {
        return summary;
      }

      if (scoreline.goalsFor > scoreline.goalsAgainst) {
        summary.wins += 1;
      } else if (scoreline.goalsFor < scoreline.goalsAgainst) {
        summary.losses += 1;
      } else {
        summary.draws += 1;
      }

      summary.played += 1;
      summary.goalsFor += scoreline.goalsFor;
      summary.goalsAgainst += scoreline.goalsAgainst;

      if (scoreline.goalsAgainst === 0) {
        summary.cleanSheets += 1;
      }

      return summary;
    },
    {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
    }
  );
  const form = [...finishedFixtures]
    .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
    .slice(0, 5)
    .map((fixture) => ({
      fixtureId: fixture.id,
      result: buildTeamResultLabel(fixture, getFixtureTeamSide(fixture, normalizedSlug)),
    }))
    .filter((entry) => entry.result);

  let playerPreview = [];
  try {
    const provider = createProvider();
    const detailedFixture = await provider.fetchFixtureDetail({ fixtureExternalRef: latestFixture.externalRef });
    const detailedUiFixture = mapFixtureToUi(detailedFixture);
    const side = getFixtureTeamSide(detailedUiFixture, normalizedSlug);
    const starters = side ? detailedUiFixture.lineups?.[side]?.starters || [] : [];
    playerPreview = starters.slice(0, 10);
  } catch (error) {
    playerPreview = [];
  }

  return {
    ...team,
    slug: normalizedSlug,
    country: leagues[0]?.country || null,
    leagues,
    venue:
      fixtures.find((fixture) => getFixtureTeamSide(fixture, normalizedSlug) === "home" && fixture.venue)?.venue ||
      latestFixture.venue ||
      null,
    fixtureSummary: summarize(fixtures),
    activeFixtures,
    recentResults,
    record,
    form,
    playerPreview,
  };
}

export async function getMatchByReferenceFromProvider(reference) {
  const provider = createProvider();
  try {
    const fixture = await provider.fetchFixtureDetail({ fixtureExternalRef: reference });
    return fixture ? mapFixtureToUi(fixture) : null;
  } catch (error) {
    const fixtures = await fetchMatchWindowFixtures();
    return fixtures.find((fixture) => fixture.externalRef === reference || fixture.id === reference) || null;
  }
}

export async function getMatchdayFeedFromProvider({
  locale = "en",
  date,
  preset,
  startDate,
  startTime,
  endDate,
  endTime,
  status,
  query,
  leagueCode,
  time,
} = {}) {
  const rangeState = resolveDateRange({
    date,
    preset,
    startDate,
    startTime,
    endDate,
    endTime,
  });
  const selectedStatus = normalizeStatus(status);
  const selectedTime = normalizeTimeFilter(time);
  const fixtures = (await fetchFixturesWindow(rangeState.activeRange.start, rangeState.activeRange.end, true)).map(
    mapFixtureToUi
  );
  const directory = await getDirectorySnapshot();
  const availableLeagueCodes = new Set(directory.leagues.map((entry) => entry.code));
  const selectedLeague = leagueCode && availableLeagueCodes.has(leagueCode) ? leagueCode : "all";
  const rangeFixtures = fixtures.filter((fixture) => matchesDateRange(fixture, rangeState.activeRange));
  const baseFiltered = applyBaseFilters(rangeFixtures, {
    query,
    leagueCode: selectedLeague,
    time: selectedTime,
  });
  const visibleFixtures =
    selectedStatus === "ALL"
      ? baseFiltered
      : baseFiltered.filter((fixture) => fixture.status === selectedStatus);
  const localeLeagueCode = getLocaleLeagueCode(locale);
  const featuredLeagueCodes = [...new Set([...GLOBAL_FEATURED_LEAGUE_CODES, localeLeagueCode])];
  const orderedFixtures = [...visibleFixtures].sort((left, right) => {
    const statusDifference = fixtureSortWeight(left) - fixtureSortWeight(right);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    const timeDifference = new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    if (timeDifference !== 0) {
      return timeDifference;
    }

    return (
      left.league.name.localeCompare(right.league.name) ||
      left.homeTeam.name.localeCompare(right.homeTeam.name)
    );
  });

  const leagueCounts = directory.leagues.map((league) => ({
    code: league.code,
    name: league.name,
    country: league.country,
    logoUrl: league.logoUrl || null,
    count: baseFiltered.filter((fixture) => fixture.league.code === league.code).length,
  }));

  return {
    selectedDate: rangeState.selectedStartDate,
    selectedStartDate: rangeState.selectedStartDate,
    selectedStartTime: rangeState.selectedStartTime,
    selectedEndDate: rangeState.selectedEndDate,
    selectedEndTime: rangeState.selectedEndTime,
    selectedPreset: rangeState.selectedPreset,
    selectedPresetLabel: rangeState.selectedPresetLabel,
    rangeStart: rangeState.activeRange.start.toISOString(),
    rangeEnd: rangeState.activeRange.end.toISOString(),
    rangeIsDefault: rangeState.isDefault,
    rangeNavigation: rangeState.navigation,
    selectedStatus,
    selectedLeague,
    selectedTime,
    query: String(query || ""),
    competitionCount: countCompetitions(baseFiltered),
    fixtures: orderedFixtures,
    groups: groupFixtures(orderedFixtures),
    summary: summarize(baseFiltered),
    quickPresetOptions: rangeState.quickPresetOptions,
    presetOptions: rangeState.presetOptions,
    statusOptions: ["ALL", "LIVE", "SCHEDULED", "FINISHED"].map((entry) => ({
      value: entry,
      count: entry === "ALL" ? baseFiltered.length : baseFiltered.filter((fixture) => fixture.status === entry).length,
    })),
    leagueOptions: [{ code: "all", name: "All leagues" }, ...leagueCounts],
    featuredLeagueOptions: featuredLeagueCodes
      .map((code) => leagueCounts.find((league) => league.code === code))
      .filter(Boolean)
      .map((league) => ({
        ...league,
        isLocaleLeague: league.code === localeLeagueCode,
      })),
    timeOptions: TIME_FILTERS,
    refresh: {
      enabled: orderedFixtures.some((fixture) => fixture.status === "LIVE"),
      intervalMs: 30000,
      until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
    surfaceState: {
      degraded: false,
      stale: false,
      staleCount: 0,
    },
  };
}

export function getSportsProviderState() {
  return getSportsSyncConfig();
}
