function pickId(value) {
  if (value == null) {
    return null;
  }

  return String(value);
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function coerceDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapFixtureStatus(stateValue, stateShortName) {
  const normalized = String(
    pickFirst(stateShortName, stateValue, "scheduled")
  ).toLowerCase();

  if (["inplay", "live", "ht", "et", "pen_live"].includes(normalized)) {
    return "LIVE";
  }

  if (["finished", "ft", "aft", "pen_finished"].includes(normalized)) {
    return "FINISHED";
  }

  if (["postponed"].includes(normalized)) {
    return "POSTPONED";
  }

  if (["cancelled", "deleted", "abandoned"].includes(normalized)) {
    return "CANCELLED";
  }

  return "SCHEDULED";
}

function normalizeLeague(rawLeague) {
  if (!rawLeague) {
    return null;
  }

  return {
    externalRef: pickId(rawLeague.id),
    name: pickFirst(rawLeague.name, rawLeague.short_name, "Unknown League"),
    country: pickFirst(rawLeague.country_name, rawLeague.country?.name),
    code: pickFirst(
      rawLeague.short_code,
      rawLeague.code,
      `LEAGUE-${pickId(rawLeague.id) || "UNKNOWN"}`
    ),
    logoUrl: pickFirst(rawLeague.image_path, rawLeague.logo_path),
    metadata: rawLeague,
  };
}

function normalizeSeason(rawSeason, fallbackLeague) {
  if (!rawSeason) {
    return null;
  }

  return {
    externalRef: pickId(rawSeason.id),
    leagueExternalRef: pickId(pickFirst(rawSeason.league_id, fallbackLeague?.externalRef)),
    name: String(
      pickFirst(rawSeason.name, rawSeason.year, rawSeason.display_name, rawSeason.id)
    ),
    startDate: coerceDate(pickFirst(rawSeason.starting_at, rawSeason.start_date)),
    endDate: coerceDate(pickFirst(rawSeason.ending_at, rawSeason.end_date)),
    isCurrent: Boolean(
      pickFirst(rawSeason.is_current, rawSeason.current, false)
    ),
    metadata: rawSeason,
  };
}

function normalizeTeam(rawTeam, fallbackLeague) {
  if (!rawTeam) {
    return null;
  }

  return {
    externalRef: pickId(rawTeam.id),
    leagueExternalRef: pickId(pickFirst(rawTeam.league_id, fallbackLeague?.externalRef)),
    name: pickFirst(rawTeam.name, rawTeam.short_name, "Unknown Team"),
    shortName: pickFirst(rawTeam.short_name, rawTeam.name),
    code: pickFirst(rawTeam.code, rawTeam.short_code, rawTeam.name),
    logoUrl: pickFirst(rawTeam.image_path, rawTeam.logo_path),
    metadata: rawTeam,
  };
}

function extractParticipants(rawFixture) {
  const participants = asArray(
    pickFirst(rawFixture.participants, rawFixture.teams, rawFixture.lineup)
  );
  const home = participants.find(
    (participant) =>
      participant.meta?.location === "home" ||
      participant.location === "home" ||
      participant.type === "home"
  );
  const away = participants.find(
    (participant) =>
      participant.meta?.location === "away" ||
      participant.location === "away" ||
      participant.type === "away"
  );

  return { home, away };
}

function extractScore(rawFixture, location) {
  const scores = asArray(rawFixture.scores);
  const score = scores.find(
    (entry) =>
      entry.score?.participant === location ||
      entry.participant === location ||
      entry.description?.toLowerCase() === location
  );

  return pickFirst(score?.score?.goals, score?.goals, score?.value, 0);
}

export function normalizeFixture(rawFixture) {
  const league = normalizeLeague(rawFixture.league);
  const season = normalizeSeason(rawFixture.season, league);
  const { home, away } = extractParticipants(rawFixture);
  const homeTeam = normalizeTeam(home, league);
  const awayTeam = normalizeTeam(away, league);
  const state = rawFixture.state || {};

  return {
    externalRef: pickId(rawFixture.id),
    league,
    season,
    homeTeam,
    awayTeam,
    startsAt: coerceDate(
      pickFirst(rawFixture.starting_at, rawFixture.start_time, rawFixture.start_date)
    ),
    venue: pickFirst(rawFixture.venue?.name, rawFixture.venue_name),
    round: pickFirst(rawFixture.round?.name, rawFixture.round_name, rawFixture.round_id),
    stateReason: pickFirst(state.reason, rawFixture.note),
    status: mapFixtureStatus(
      pickFirst(state.developer_name, state.state, rawFixture.status),
      state.short_name
    ),
    resultSnapshot: {
      homeScore: Number(extractScore(rawFixture, "home") || 0),
      awayScore: Number(extractScore(rawFixture, "away") || 0),
      statusText: pickFirst(state.name, state.short_name, rawFixture.status),
      payload: rawFixture,
    },
    metadata: rawFixture,
  };
}

export function normalizeStanding(rawStanding, seasonExternalRef) {
  const team = normalizeTeam(rawStanding.participant || rawStanding.team || rawStanding);

  return {
    seasonExternalRef: pickId(seasonExternalRef),
    team,
    position: Number(pickFirst(rawStanding.position, 0)),
    played: Number(pickFirst(rawStanding.details?.matches_played, rawStanding.played, 0)),
    won: Number(pickFirst(rawStanding.details?.won, rawStanding.won, 0)),
    drawn: Number(pickFirst(rawStanding.details?.draw, rawStanding.drawn, 0)),
    lost: Number(pickFirst(rawStanding.details?.lost, rawStanding.lost, 0)),
    goalsFor: Number(pickFirst(rawStanding.details?.goals_scored, rawStanding.goals_for, 0)),
    goalsAgainst: Number(
      pickFirst(rawStanding.details?.goals_against, rawStanding.goals_against, 0)
    ),
    points: Number(pickFirst(rawStanding.details?.points, rawStanding.points, 0)),
    metadata: rawStanding,
  };
}

export function normalizeOdds(rawOdds, fixtureExternalRef) {
  const marketName = pickFirst(
    rawOdds.market?.name,
    rawOdds.label,
    rawOdds.name,
    "Unknown Market"
  );
  const bookmakerName = pickFirst(
    rawOdds.bookmaker?.name,
    rawOdds.bookmaker_name,
    "SportsMonks"
  );
  const normalizedValues = asArray(rawOdds.values || rawOdds.market?.values).map((value) => ({
    externalRef: pickId(value.id),
    label: String(pickFirst(value.label, value.value, value.name, "Selection")),
    line: value.handicap ?? value.line ?? null,
    priceDecimal: Number(pickFirst(value.odds, value.value, value.price, 0)),
    isActive: !Boolean(value.stopped || value.suspended),
    metadata: value,
  }));

  return {
    externalRef: pickId(rawOdds.id),
    fixtureExternalRef: pickId(fixtureExternalRef),
    bookmaker: bookmakerName,
    marketType: marketName,
    suspended: Boolean(rawOdds.stopped || rawOdds.suspended),
    selections: normalizedValues,
    metadata: rawOdds,
  };
}

export function normalizeBroadcastChannel(rawChannel, fixtureExternalRef) {
  const countries = asArray(rawChannel.countries || rawChannel.country);

  return {
    fixtureExternalRef: pickId(fixtureExternalRef),
    name: String(pickFirst(rawChannel.name, rawChannel.channel_name, "Unknown Channel")),
    territory: pickFirst(
      countries[0]?.iso2,
      countries[0]?.iso_2,
      countries[0]?.code,
      countries[0]?.name,
      rawChannel.territory,
      rawChannel.country_name
    ),
    channelType: pickFirst(rawChannel.type, rawChannel.channel_type, rawChannel.kind, null),
    url: pickFirst(rawChannel.url, rawChannel.website, null),
    isActive: !Boolean(rawChannel.stopped || rawChannel.inactive),
    metadata: rawChannel,
  };
}

export function normalizeSportsMonksFixtures(payload) {
  return asArray(payload).map(normalizeFixture).filter((fixture) => fixture.externalRef);
}

export function normalizeSportsMonksStandings(payload, seasonExternalRef) {
  return asArray(payload)
    .flatMap((entry) =>
      asArray(entry.standings || entry.data).length ? asArray(entry.standings || entry.data) : [entry]
    )
    .map((entry) => normalizeStanding(entry, seasonExternalRef))
    .filter((standing) => standing.team?.externalRef);
}

export function normalizeSportsMonksTeams(payload) {
  return asArray(payload).map((team) => normalizeTeam(team)).filter((team) => team.externalRef);
}

export function normalizeSportsMonksOdds(payload, fixtureExternalRef) {
  return asArray(payload)
    .map((entry) => normalizeOdds(entry, fixtureExternalRef))
    .filter((market) => market.externalRef || market.selections.length > 0);
}

export function normalizeSportsMonksBroadcastChannels(payload, fixtureExternalRef) {
  return asArray(payload)
    .map((entry) => normalizeBroadcastChannel(entry, fixtureExternalRef))
    .filter((channel) => channel.fixtureExternalRef && channel.name);
}
