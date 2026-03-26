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

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function setTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function toDateKey(value) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function normalizeDateInput(value) {
  if (!value) {
    return toDateKey(new Date());
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? toDateKey(new Date()) : toDateKey(parsed);
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
    },
    awayTeam: {
      id: `${config.id}-away`,
      name: config.awayTeam.name,
      shortName: config.awayTeam.shortName,
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

function groupFixtures(fixtures) {
  const grouped = fixtures.reduce((map, fixture) => {
    const key = fixture.league.code;

    if (!map.has(key)) {
      map.set(key, {
        key,
        leagueCode: fixture.league.code,
        leagueName: fixture.league.name,
        country: fixture.league.country,
        fixtures: [],
      });
    }

    map.get(key).fixtures.push(fixture);
    return map;
  }, new Map());

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      summary: summarize(group.fixtures),
      fixtures: [...group.fixtures].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      ),
    }))
    .sort((left, right) => left.leagueName.localeCompare(right.leagueName));
}

function normalizeStatus(status) {
  const value = String(status || "all").trim().toUpperCase();
  return ["ALL", "LIVE", "SCHEDULED", "FINISHED"].includes(value) ? value : "ALL";
}

function normalizeTimeFilter(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  return TIME_FILTERS.some((entry) => entry.value === normalized) ? normalized : "all";
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
  status,
  query,
  leagueCode,
  time,
} = {}) {
  const fixtures = buildFixtures();
  const selectedDate = normalizeDateInput(date);
  const selectedStatus = normalizeStatus(status);
  const selectedLeague = leagueCode && LEAGUES.some((entry) => entry.code === leagueCode) ? leagueCode : "all";
  const selectedTime = normalizeTimeFilter(time);
  const dateFixtures = fixtures.filter((fixture) => toDateKey(fixture.startsAt) === selectedDate);
  const baseFiltered = applyBaseFilters(dateFixtures, {
    query,
    leagueCode: selectedLeague,
    time: selectedTime,
  });
  const visibleFixtures =
    selectedStatus === "ALL"
      ? baseFiltered
      : baseFiltered.filter((fixture) => fixture.status === selectedStatus);
  const orderedFixtures = [...visibleFixtures].sort((left, right) => {
    const statusDifference = fixtureSortWeight(left) - fixtureSortWeight(right);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });

  return {
    selectedDate,
    selectedStatus,
    selectedLeague,
    selectedTime,
    query: String(query || ""),
    fixtures: orderedFixtures,
    groups: groupFixtures(orderedFixtures),
    summary: summarize(baseFiltered),
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
