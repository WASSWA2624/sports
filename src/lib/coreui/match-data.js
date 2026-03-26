import { buildMockTeamLogoUrl } from "./team-branding";

const LEAGUES = [
  { code: "EPL", name: "Premier League", country: "England", season: "2025/2026" },
  { code: "UCL", name: "UEFA Champions League", country: "Europe", season: "2025/2026" },
  { code: "LL", name: "LaLiga", country: "Spain", season: "2025/2026" },
  { code: "SA", name: "Serie A", country: "Italy", season: "2025/2026" },
  { code: "BL1", name: "Bundesliga", country: "Germany", season: "2025/2026" },
];

const TIME_FILTERS = [
  { value: "all", label: "Any time" },
  { value: "night", label: "00:00 - 05:59" },
  { value: "morning", label: "06:00 - 11:59" },
  { value: "afternoon", label: "12:00 - 17:59" },
  { value: "evening", label: "18:00 - 23:59" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:59";
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

function normalizeDateInput(value) {
  const parsedDate = parseDateKey(value);

  if (parsedDate) {
    return toDateKey(parsedDate);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? toDateKey(new Date()) : toDateKey(parsed);
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

function getLeague(code) {
  return LEAGUES.find((league) => league.code === code) || LEAGUES[0];
}

function buildTimeline(entries = []) {
  return entries.map((entry, index) => ({
    id: `${entry.minute || "event"}-${index}-${entry.title}`,
    minuteLabel: entry.minute ? `${entry.minute}'` : "Event",
    title: entry.title,
    actor: entry.actor || null,
    secondaryActor: entry.secondaryActor || null,
    description: entry.description,
    featured: Boolean(entry.featured),
  }));
}

function buildLineup(players = [], formation = null) {
  return {
    formation,
    starters: players.map((player, index) => ({
      id: `${player.name}-${index}`,
      name: player.name,
      jerseyNumber: player.number,
    })),
  };
}

function buildFixture(baseDate, config) {
  const league = getLeague(config.leagueCode);
  const startsAt = setTime(addDays(baseDate, config.dayOffset || 0), config.hour, config.minute);

  return {
    id: config.id,
    externalRef: config.id,
    league: {
      code: league.code,
      name: league.name,
      country: league.country,
    },
    round: config.round || null,
    startsAt: startsAt.toISOString(),
    status: config.status,
    homeTeam: {
      id: `${config.id}-home`,
      name: config.homeTeam.name,
      shortName: config.homeTeam.shortName,
      logoUrl: buildMockTeamLogoUrl(config.homeTeam.name),
    },
    awayTeam: {
      id: `${config.id}-away`,
      name: config.awayTeam.name,
      shortName: config.awayTeam.shortName,
      logoUrl: buildMockTeamLogoUrl(config.awayTeam.name),
    },
    resultSnapshot:
      config.score
        ? {
            homeScore: config.score.home,
            awayScore: config.score.away,
            capturedAt: new Date().toISOString(),
          }
        : null,
    clockMinute: config.clockMinute || null,
    venue: config.venue || null,
    referee: config.referee || null,
    statistics: config.statistics || [],
    lineups: config.lineups || null,
    timeline: buildTimeline(config.timeline || []),
  };
}

function buildFixtures() {
  const today = startOfDay(new Date());

  return [
    buildFixture(today, {
      id: "epl-live-ars-che",
      leagueCode: "EPL",
      dayOffset: 0,
      hour: 19,
      minute: 0,
      status: "LIVE",
      clockMinute: 61,
      round: "Matchday 30",
      homeTeam: { name: "Arsenal", shortName: "ARS" },
      awayTeam: { name: "Chelsea", shortName: "CHE" },
      score: { home: 2, away: 1 },
      venue: "Emirates Stadium",
      referee: "Michael Oliver",
      timeline: [
        { minute: 12, title: "Goal", actor: "Bukayo Saka", description: "Arsenal take the lead.", featured: true },
        { minute: 34, title: "Goal", actor: "Cole Palmer", description: "Chelsea equalise from the edge of the box.", featured: true },
        { minute: 61, title: "Goal", actor: "Kai Havertz", description: "Arsenal move back in front.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "58%", away: "42%", homeShare: 58, awayShare: 42 },
        { key: "shots", label: "Shots", home: "13", away: "8", homeShare: 62, awayShare: 38 },
        { key: "corners", label: "Corners", home: "6", away: "3", homeShare: 67, awayShare: 33 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "David Raya", number: 22 },
            { name: "Ben White", number: 4 },
            { name: "William Saliba", number: 2 },
            { name: "Gabriel", number: 6 },
            { name: "Declan Rice", number: 41 },
          ],
          "4-3-3"
        ),
        away: buildLineup(
          [
            { name: "Robert Sanchez", number: 1 },
            { name: "Reece James", number: 24 },
            { name: "Levi Colwill", number: 26 },
            { name: "Enzo Fernandez", number: 8 },
            { name: "Cole Palmer", number: 20 },
          ],
          "4-2-3-1"
        ),
      },
    }),
    buildFixture(today, {
      id: "ucl-live-rma-bay",
      leagueCode: "UCL",
      dayOffset: 0,
      hour: 22,
      minute: 0,
      status: "LIVE",
      clockMinute: 48,
      round: "Quarter-final",
      homeTeam: { name: "Real Madrid", shortName: "RMA" },
      awayTeam: { name: "Bayern Munich", shortName: "BAY" },
      score: { home: 1, away: 1 },
      venue: "Santiago Bernabeu",
      referee: "Daniele Orsato",
      timeline: [
        { minute: 19, title: "Goal", actor: "Vinicius Junior", description: "Madrid strike first on the break.", featured: true },
        { minute: 48, title: "Goal", actor: "Harry Kane", description: "Bayern level shortly after halftime.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "49%", away: "51%", homeShare: 49, awayShare: 51 },
        { key: "shots", label: "Shots", home: "9", away: "10", homeShare: 47, awayShare: 53 },
        { key: "xg", label: "xG", home: "1.12", away: "1.03", homeShare: 52, awayShare: 48 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "Andriy Lunin", number: 13 },
            { name: "Dani Carvajal", number: 2 },
            { name: "Antonio Rudiger", number: 22 },
            { name: "Jude Bellingham", number: 5 },
            { name: "Vinicius Junior", number: 7 },
          ],
          "4-4-2"
        ),
        away: buildLineup(
          [
            { name: "Manuel Neuer", number: 1 },
            { name: "Joshua Kimmich", number: 6 },
            { name: "Matthijs de Ligt", number: 4 },
            { name: "Jamal Musiala", number: 42 },
            { name: "Harry Kane", number: 9 },
          ],
          "4-2-3-1"
        ),
      },
    }),
    buildFixture(today, {
      id: "ll-upcoming-bar-sev",
      leagueCode: "LL",
      dayOffset: 0,
      hour: 23,
      minute: 30,
      status: "SCHEDULED",
      round: "Matchday 30",
      homeTeam: { name: "Barcelona", shortName: "BAR" },
      awayTeam: { name: "Sevilla", shortName: "SEV" },
      venue: "Estadi Olimpic Lluis Companys",
      referee: "Jose Maria Sanchez",
      lineups: {
        home: buildLineup([], "4-3-3"),
        away: buildLineup([], "4-2-3-1"),
      },
    }),
    buildFixture(today, {
      id: "sa-upcoming-int-laz",
      leagueCode: "SA",
      dayOffset: 0,
      hour: 21,
      minute: 45,
      status: "SCHEDULED",
      round: "Matchday 31",
      homeTeam: { name: "Inter", shortName: "INT" },
      awayTeam: { name: "Lazio", shortName: "LAZ" },
      venue: "San Siro",
      referee: "Davide Massa",
      lineups: {
        home: buildLineup([], "3-5-2"),
        away: buildLineup([], "4-3-3"),
      },
    }),
    buildFixture(today, {
      id: "bl1-finished-bvb-rbl",
      leagueCode: "BL1",
      dayOffset: 0,
      hour: 16,
      minute: 30,
      status: "FINISHED",
      round: "Matchday 28",
      homeTeam: { name: "Borussia Dortmund", shortName: "BVB" },
      awayTeam: { name: "RB Leipzig", shortName: "RBL" },
      score: { home: 3, away: 2 },
      venue: "Signal Iduna Park",
      referee: "Felix Zwayer",
      timeline: [
        { minute: 9, title: "Goal", actor: "Niclas Fullkrug", description: "Dortmund open the scoring.", featured: true },
        { minute: 88, title: "Goal", actor: "Julian Brandt", description: "Late winner for Dortmund.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "46%", away: "54%", homeShare: 46, awayShare: 54 },
        { key: "shots", label: "Shots", home: "12", away: "15", homeShare: 44, awayShare: 56 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "Gregor Kobel", number: 1 },
            { name: "Mats Hummels", number: 15 },
            { name: "Julian Brandt", number: 19 },
          ],
          "4-2-3-1"
        ),
        away: buildLineup(
          [
            { name: "Janis Blaswich", number: 21 },
            { name: "Willi Orban", number: 4 },
            { name: "Xavi Simons", number: 20 },
          ],
          "4-4-2"
        ),
      },
    }),
    buildFixture(today, {
      id: "epl-finished-mci-liv",
      leagueCode: "EPL",
      dayOffset: -1,
      hour: 20,
      minute: 30,
      status: "FINISHED",
      round: "Matchday 29",
      homeTeam: { name: "Manchester City", shortName: "MCI" },
      awayTeam: { name: "Liverpool", shortName: "LIV" },
      score: { home: 2, away: 2 },
      venue: "Etihad Stadium",
      referee: "Anthony Taylor",
      timeline: [
        { minute: 15, title: "Goal", actor: "Erling Haaland", description: "City finish a fast move.", featured: true },
        { minute: 73, title: "Goal", actor: "Mohamed Salah", description: "Liverpool level in the second half.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "55%", away: "45%", homeShare: 55, awayShare: 45 },
        { key: "shots", label: "Shots", home: "14", away: "11", homeShare: 56, awayShare: 44 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "Ederson", number: 31 },
            { name: "Ruben Dias", number: 3 },
            { name: "Rodri", number: 16 },
          ],
          "4-3-3"
        ),
        away: buildLineup(
          [
            { name: "Alisson", number: 1 },
            { name: "Virgil van Dijk", number: 4 },
            { name: "Mohamed Salah", number: 11 },
          ],
          "4-3-3"
        ),
      },
    }),
    buildFixture(today, {
      id: "ll-finished-atm-rso",
      leagueCode: "LL",
      dayOffset: -1,
      hour: 22,
      minute: 15,
      status: "FINISHED",
      round: "Matchday 29",
      homeTeam: { name: "Atletico Madrid", shortName: "ATM" },
      awayTeam: { name: "Real Sociedad", shortName: "RSO" },
      score: { home: 1, away: 0 },
      venue: "Metropolitano",
      referee: "Juan Martinez",
      timeline: [
        { minute: 57, title: "Goal", actor: "Antoine Griezmann", description: "Atletico take all three points.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "52%", away: "48%", homeShare: 52, awayShare: 48 },
        { key: "shots", label: "Shots", home: "10", away: "9", homeShare: 53, awayShare: 47 },
      ],
      lineups: {
        home: buildLineup([{ name: "Jan Oblak", number: 13 }], "3-5-2"),
        away: buildLineup([{ name: "Alex Remiro", number: 1 }], "4-3-3"),
      },
    }),
    buildFixture(today, {
      id: "epl-finished-tot-avl",
      leagueCode: "EPL",
      dayOffset: -7,
      hour: 18,
      minute: 0,
      status: "FINISHED",
      round: "Matchday 28",
      homeTeam: { name: "Tottenham Hotspur", shortName: "TOT" },
      awayTeam: { name: "Aston Villa", shortName: "AVL" },
      score: { home: 2, away: 1 },
      venue: "Tottenham Hotspur Stadium",
      referee: "Jarred Gillett",
      timeline: [
        { minute: 22, title: "Goal", actor: "Son Heung-min", description: "Spurs break the deadlock.", featured: true },
        { minute: 79, title: "Goal", actor: "James Maddison", description: "Late winner in North London.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "57%", away: "43%", homeShare: 57, awayShare: 43 },
        { key: "shots", label: "Shots", home: "16", away: "10", homeShare: 62, awayShare: 38 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "Guglielmo Vicario", number: 13 },
            { name: "Cristian Romero", number: 17 },
            { name: "James Maddison", number: 10 },
          ],
          "4-2-3-1"
        ),
        away: buildLineup(
          [
            { name: "Emiliano Martinez", number: 1 },
            { name: "Ezri Konsa", number: 4 },
            { name: "Ollie Watkins", number: 11 },
          ],
          "4-4-2"
        ),
      },
    }),
    buildFixture(today, {
      id: "ucl-finished-psg-ben",
      leagueCode: "UCL",
      dayOffset: -30,
      hour: 22,
      minute: 0,
      status: "FINISHED",
      round: "Round of 16",
      homeTeam: { name: "Paris Saint-Germain", shortName: "PSG" },
      awayTeam: { name: "Benfica", shortName: "BEN" },
      score: { home: 3, away: 1 },
      venue: "Parc des Princes",
      referee: "Clement Turpin",
      timeline: [
        { minute: 11, title: "Goal", actor: "Kylian Mbappe", description: "PSG start fast from the spot.", featured: true },
        { minute: 67, title: "Goal", actor: "Goncalo Ramos", description: "Paris pull clear after the break.", featured: true },
      ],
      statistics: [
        { key: "possession", label: "Possession", home: "61%", away: "39%", homeShare: 61, awayShare: 39 },
        { key: "shots", label: "Shots", home: "18", away: "7", homeShare: 72, awayShare: 28 },
      ],
      lineups: {
        home: buildLineup(
          [
            { name: "Gianluigi Donnarumma", number: 99 },
            { name: "Marquinhos", number: 5 },
            { name: "Vitinha", number: 17 },
          ],
          "4-3-3"
        ),
        away: buildLineup(
          [
            { name: "Anatoliy Trubin", number: 1 },
            { name: "Nicolas Otamendi", number: 30 },
            { name: "Angel Di Maria", number: 11 },
          ],
          "4-2-3-1"
        ),
      },
    }),
    buildFixture(today, {
      id: "ucl-upcoming-psg-int",
      leagueCode: "UCL",
      dayOffset: 1,
      hour: 22,
      minute: 0,
      status: "SCHEDULED",
      round: "Quarter-final",
      homeTeam: { name: "Paris Saint-Germain", shortName: "PSG" },
      awayTeam: { name: "Inter", shortName: "INT" },
      venue: "Parc des Princes",
      referee: "Szymon Marciniak",
      lineups: {
        home: buildLineup([], "4-3-3"),
        away: buildLineup([], "3-5-2"),
      },
    }),
    buildFixture(today, {
      id: "ll-upcoming-val-bet",
      leagueCode: "LL",
      dayOffset: 7,
      hour: 20,
      minute: 30,
      status: "SCHEDULED",
      round: "Matchday 31",
      homeTeam: { name: "Valencia", shortName: "VAL" },
      awayTeam: { name: "Real Betis", shortName: "BET" },
      venue: "Mestalla",
      referee: "Guillermo Cuadra",
      lineups: {
        home: buildLineup([], "4-4-2"),
        away: buildLineup([], "4-2-3-1"),
      },
    }),
    buildFixture(today, {
      id: "sa-upcoming-mil-nap",
      leagueCode: "SA",
      dayOffset: 1,
      hour: 21,
      minute: 45,
      status: "SCHEDULED",
      round: "Matchday 31",
      homeTeam: { name: "AC Milan", shortName: "MIL" },
      awayTeam: { name: "Napoli", shortName: "NAP" },
      venue: "San Siro",
      referee: "Maurizio Mariani",
      lineups: {
        home: buildLineup([], "4-2-3-1"),
        away: buildLineup([], "4-3-3"),
      },
    }),
    buildFixture(today, {
      id: "bl1-upcoming-lev-fra",
      leagueCode: "BL1",
      dayOffset: 32,
      hour: 18,
      minute: 30,
      status: "SCHEDULED",
      round: "Matchday 33",
      homeTeam: { name: "Bayer Leverkusen", shortName: "B04" },
      awayTeam: { name: "Eintracht Frankfurt", shortName: "SGE" },
      venue: "BayArena",
      referee: "Deniz Aytekin",
      lineups: {
        home: buildLineup([], "3-4-2-1"),
        away: buildLineup([], "3-4-2-1"),
      },
    }),
  ].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
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

export function getShellData() {
  const fixtures = buildFixtures();
  const leagues = LEAGUES.map((league) => ({
    code: league.code,
    name: league.name,
    country: league.country,
  }));
  const countries = [...new Map(
    leagues.map((league) => [league.country, {
      country: league.country,
      leagues: leagues.filter((entry) => entry.country === league.country),
    }])
  ).values()];

  return {
    featuredCompetitions: leagues,
    countryGroups: countries,
    fixtures,
  };
}

export function getLeagueDirectory() {
  const fixtures = buildFixtures();

  return LEAGUES.map((league) => ({
    id: league.code,
    code: league.code,
    name: league.name,
    country: league.country,
    season: league.season,
    teams: [
      ...new Set(
        fixtures
          .filter((fixture) => fixture.league.code === league.code)
          .flatMap((fixture) => [fixture.homeTeam.name, fixture.awayTeam.name])
      ),
    ],
    fixtures: fixtures.filter((fixture) => fixture.league.code === league.code),
  })).sort((left, right) => left.name.localeCompare(right.name));
}

export function getLeagueDetail(leagueCode) {
  const league = getLeagueDirectory().find((entry) => entry.code === leagueCode);

  if (!league) {
    return null;
  }

  return {
    ...league,
    fixtureSummary: summarize(league.fixtures),
    seasons: [{ id: league.season, name: league.season }],
    selectedSeason: { id: league.season, name: league.season },
    archiveSeasons: [{ id: league.season, name: league.season, fixtureCount: league.fixtures.length }],
  };
}

export function getMatchByReference(reference) {
  return buildFixtures().find((fixture) => fixture.id === reference || fixture.externalRef === reference) || null;
}

export function getMatchdayFeed({
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
  const fixtures = buildFixtures();
  const rangeState = resolveDateRange({
    date,
    preset,
    startDate,
    startTime,
    endDate,
    endTime,
  });
  const selectedStatus = normalizeStatus(status);
  const selectedLeague = leagueCode && LEAGUES.some((entry) => entry.code === leagueCode) ? leagueCode : "all";
  const selectedTime = normalizeTimeFilter(time);
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
  const orderedFixtures = [...visibleFixtures].sort((left, right) => {
    const timeDifference = new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    if (timeDifference !== 0) {
      return timeDifference;
    }

    return (
      fixtureSortWeight(left) - fixtureSortWeight(right) ||
      left.league.name.localeCompare(right.league.name) ||
      left.homeTeam.name.localeCompare(right.homeTeam.name)
    );
  });

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
    leagueOptions: [{ code: "all", name: "All leagues" }, ...LEAGUES.map((league) => ({
      code: league.code,
      name: league.name,
    }))],
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

export function buildMatchStatusLabel(fixture, locale = "en") {
  if (fixture.status === "LIVE") {
    if (Number.isFinite(fixture.clockMinute)) {
      return `${fixture.clockMinute}'`;
    }

    const diffMs = Date.now() - new Date(fixture.startsAt).getTime();
    const minute = Math.max(1, Math.floor(diffMs / 60000));
    return `${Math.min(minute, 90)}'`;
  }

  if (fixture.status === "FINISHED") {
    return "FT";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.startsAt));
}

export function buildMatchTimeLabel(fixture, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.startsAt));
}
