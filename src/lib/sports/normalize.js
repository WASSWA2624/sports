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

function normalizeLabelValue(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  return String(value);
}

function hasOwnKey(value, key) {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key));
}

function toInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSortToken(value, fallback = null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.includes(":")) {
    const parts = value.split(":").map((entry) => Number.parseInt(entry, 10));
    if (parts.every((entry) => Number.isFinite(entry))) {
      return parts[0] * 100 + parts[1];
    }
  }

  return toInteger(value, fallback);
}

function normalizeMetricKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || null;
}

function normalizeFixtureSide(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes("home")) {
    return "HOME";
  }

  if (normalized.includes("away")) {
    return "AWAY";
  }

  if (normalized.includes("neutral")) {
    return "NEUTRAL";
  }

  return null;
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

function normalizeStage(rawStage) {
  if (!rawStage || typeof rawStage !== "object") {
    return null;
  }

  return {
    externalRef: pickId(rawStage.id),
    name: pickFirst(rawStage.name, rawStage.short_name, rawStage.stage_name, "Stage"),
    code: pickFirst(rawStage.code, rawStage.short_code, rawStage.id),
    stageType: pickFirst(rawStage.type, rawStage.developer_name, rawStage.category),
    status: pickFirst(rawStage.status, rawStage.state, null),
    sortOrder: Number(pickFirst(rawStage.sort_order, rawStage.order, 0)),
    metadata: rawStage,
  };
}

function normalizeRound(rawRound) {
  if (!rawRound) {
    return null;
  }

  if (typeof rawRound !== "object") {
    const name = normalizeLabelValue(rawRound, "Round");
    return {
      externalRef: pickId(rawRound),
      name,
      code: name,
      roundType: null,
      sequence: Number.isFinite(Number(rawRound)) ? Number(rawRound) : null,
      startsAt: null,
      endsAt: null,
      isCurrent: false,
      metadata: { value: rawRound },
    };
  }

  return {
    externalRef: pickId(rawRound.id),
    name: pickFirst(rawRound.name, rawRound.round_name, rawRound.label, "Round"),
    code: pickFirst(rawRound.code, rawRound.short_code, rawRound.id),
    roundType: pickFirst(rawRound.type, rawRound.developer_name, rawRound.category),
    sequence: Number(
      pickFirst(rawRound.sequence, rawRound.sort_order, rawRound.order, rawRound.round_number)
    ),
    startsAt: coerceDate(pickFirst(rawRound.starting_at, rawRound.start_date)),
    endsAt: coerceDate(pickFirst(rawRound.ending_at, rawRound.end_date)),
    isCurrent: Boolean(pickFirst(rawRound.is_current, rawRound.current, false)),
    metadata: rawRound,
  };
}

function normalizeBookmaker(rawBookmaker) {
  if (!rawBookmaker) {
    return null;
  }

  const name = pickFirst(rawBookmaker.name, rawBookmaker.bookmaker_name, "SportsBook");

  return {
    externalRef: pickId(rawBookmaker.id),
    code: pickFirst(rawBookmaker.code, rawBookmaker.slug, rawBookmaker.name),
    slug: pickFirst(rawBookmaker.slug, rawBookmaker.name),
    name,
    shortName: pickFirst(rawBookmaker.short_name, rawBookmaker.abbreviation, null),
    websiteUrl: pickFirst(rawBookmaker.url, rawBookmaker.website, rawBookmaker.link, null),
    logoUrl: pickFirst(rawBookmaker.image_path, rawBookmaker.logo_path, null),
    isActive: !Boolean(rawBookmaker.inactive),
    metadata: rawBookmaker,
  };
}

function collectRelationIds(...values) {
  const ids = new Set();

  for (const value of values) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of collectRelationIds(...value)) {
        ids.add(entry);
      }
      continue;
    }

    if (typeof value === "object") {
      for (const entry of [
        value.id,
        value.participant_id,
        value.team_id,
        value.player_id,
        value.externalRef,
      ]) {
        if (entry != null && entry !== "") {
          ids.add(String(entry));
        }
      }
      continue;
    }

    ids.add(String(value));
  }

  return ids;
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

function buildFixtureParticipantContext(rawFixture, homeParticipant, awayParticipant, homeTeam, awayTeam) {
  return {
    homeIds: collectRelationIds(
      homeParticipant,
      rawFixture.home_team_id,
      rawFixture.homeTeamId,
      rawFixture.home_team,
      homeTeam?.externalRef
    ),
    awayIds: collectRelationIds(
      awayParticipant,
      rawFixture.away_team_id,
      rawFixture.awayTeamId,
      rawFixture.away_team,
      awayTeam?.externalRef
    ),
    homeTeamExternalRef: pickId(homeTeam?.externalRef),
    awayTeamExternalRef: pickId(awayTeam?.externalRef),
  };
}

function resolveFixtureSide(context, ...values) {
  const ids = collectRelationIds(...values);
  for (const candidate of ids) {
    if (context.homeIds.has(candidate)) {
      return "HOME";
    }

    if (context.awayIds.has(candidate)) {
      return "AWAY";
    }
  }

  return null;
}

function resolveTeamExternalRef(context, side) {
  if (side === "HOME") {
    return context.homeTeamExternalRef;
  }

  if (side === "AWAY") {
    return context.awayTeamExternalRef;
  }

  return null;
}

function normalizePlayerRecord(rawPlayer, fallbackName = null, fallbackId = null) {
  const source = rawPlayer && typeof rawPlayer === "object" ? rawPlayer : {};
  const name = pickFirst(
    source.display_name,
    source.name,
    source.full_name,
    source.common_name,
    fallbackName
  );
  const externalRef = pickId(
    pickFirst(source.id, source.player_id, source.participant_id, fallbackId)
  );

  if (!name && !externalRef) {
    return null;
  }

  return {
    externalRef,
    name: name || "Unknown Player",
    shortName: pickFirst(source.short_name, source.shortName, source.display_name, name, null),
    countryName: pickFirst(source.country_name, source.country?.name, source.nationality, null),
    metadata: rawPlayer && typeof rawPlayer === "object" ? rawPlayer : null,
  };
}

function normalizeIncident(rawEvent, context, index = 0) {
  if (!rawEvent || typeof rawEvent !== "object") {
    return null;
  }

  const side =
    normalizeFixtureSide(rawEvent.location) ||
    resolveFixtureSide(
      context,
      rawEvent.participant_id,
      rawEvent.team_id,
      rawEvent.participant,
      rawEvent.team,
      rawEvent.player,
      rawEvent.player_id
    );
  const player = normalizePlayerRecord(
    rawEvent.player,
    pickFirst(rawEvent.player_name, rawEvent.participant?.name),
    pickFirst(rawEvent.player_id, rawEvent.participant_id)
  );
  const secondaryPlayer = normalizePlayerRecord(
    pickFirst(rawEvent.related_player, rawEvent.assist_player),
    pickFirst(rawEvent.related_player_name, rawEvent.assist_player_name),
    pickFirst(rawEvent.related_player_id, rawEvent.assist_player_id)
  );

  return {
    teamExternalRef: resolveTeamExternalRef(context, side),
    player,
    secondaryPlayer,
    minute: toInteger(
      pickFirst(rawEvent.minute, rawEvent.clock?.minute, rawEvent.time?.minute),
      null
    ),
    extraMinute: toInteger(
      pickFirst(rawEvent.extra_minute, rawEvent.injury_time, rawEvent.time?.extra_minute),
      null
    ),
    sortOrder: toInteger(
      pickFirst(rawEvent.sort_order, rawEvent.order, rawEvent.minute, index),
      index
    ),
    side,
    incidentKey: pickFirst(
      rawEvent.type?.developer_name,
      rawEvent.type?.code,
      rawEvent.type?.name,
      rawEvent.name,
      rawEvent.id
    ),
    type: pickFirst(rawEvent.type?.developer_name, rawEvent.type?.name, rawEvent.name, "EVENT"),
    title: pickFirst(rawEvent.type?.name, rawEvent.name, "Event"),
    description: pickFirst(rawEvent.info, rawEvent.description, rawEvent.comment, rawEvent.note, null),
    secondaryLabel: pickFirst(
      rawEvent.related_player_name,
      rawEvent.assist_player_name,
      rawEvent.result,
      rawEvent.score,
      null
    ),
    payload: rawEvent,
  };
}

function normalizeLineupEntry(rawLineup, context, index = 0) {
  if (!rawLineup || typeof rawLineup !== "object") {
    return null;
  }

  const side =
    normalizeFixtureSide(rawLineup.location) ||
    resolveFixtureSide(
      context,
      rawLineup.participant_id,
      rawLineup.team_id,
      rawLineup.participant,
      rawLineup.team
    );
  const player = normalizePlayerRecord(
    rawLineup.player,
    pickFirst(rawLineup.player_name, rawLineup.player?.name),
    pickFirst(rawLineup.player_id, rawLineup.player?.id)
  );
  const lineupTypeId = toInteger(rawLineup.type_id, null);
  const formationField = normalizeLabelValue(
    pickFirst(rawLineup.formation_field, rawLineup.formation_position),
    null
  );
  const isStarter =
    lineupTypeId === 11 ||
    (lineupTypeId == null &&
      (rawLineup.formation_field != null || rawLineup.formation_position != null));

  if (!player) {
    return null;
  }

  return {
    externalRef: pickId(rawLineup.id),
    teamExternalRef: resolveTeamExternalRef(context, side),
    player,
    side,
    entryType: pickFirst(
      rawLineup.type?.name,
      rawLineup.position?.name,
      rawLineup.position_name,
      lineupTypeId != null ? `TYPE_${lineupTypeId}` : null
    ),
    jerseyNumber: normalizeLabelValue(
      pickFirst(rawLineup.jersey_number, rawLineup.shirt_number),
      null
    ),
    formationSlot: formationField ? formationField.replace(":", "-") : null,
    positionLabel: pickFirst(
      rawLineup.position?.name,
      rawLineup.position_name,
      rawLineup.detailedposition?.name,
      null
    ),
    isStarter,
    sortOrder: toSortToken(
      pickFirst(rawLineup.sort_order, rawLineup.formation_position, rawLineup.formation_field, index),
      index
    ),
    metadata: rawLineup,
  };
}

function normalizeStatisticEntry(rawStatistic, context, index = 0) {
  if (!rawStatistic || typeof rawStatistic !== "object") {
    return null;
  }

  const side =
    normalizeFixtureSide(rawStatistic.location) ||
    resolveFixtureSide(
      context,
      rawStatistic.participant_id,
      rawStatistic.team_id,
      rawStatistic.participant,
      rawStatistic.team
    );
  const name = pickFirst(rawStatistic.type?.name, rawStatistic.name, rawStatistic.type?.code, "Statistic");
  const value = normalizeLabelValue(
    pickFirst(
      rawStatistic.data?.value,
      rawStatistic.data?.total,
      rawStatistic.data?.percentage,
      rawStatistic.value,
      rawStatistic.data
    ),
    null
  );

  if (!value) {
    return null;
  }

  return {
    teamExternalRef: resolveTeamExternalRef(context, side),
    side,
    metricKey: normalizeMetricKey(
      pickFirst(rawStatistic.type?.code, rawStatistic.type?.developer_name, name)
    ),
    name,
    statGroup: pickFirst(rawStatistic.type?.stat_group, rawStatistic.group, rawStatistic.category, null),
    period: pickFirst(rawStatistic.period, rawStatistic.type?.period, null),
    value,
    sortOrder: toInteger(
      pickFirst(rawStatistic.sort_order, rawStatistic.type?.sort_order, rawStatistic.order, index),
      index
    ),
    metadata: rawStatistic,
  };
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
  const participantContext = buildFixtureParticipantContext(
    rawFixture,
    home,
    away,
    homeTeam,
    awayTeam
  );
  const stage = normalizeStage(rawFixture.stage);
  const roundInfo = normalizeRound(
    rawFixture.round && typeof rawFixture.round === "object"
      ? rawFixture.round
      : pickFirst(rawFixture.round, rawFixture.round_name, rawFixture.round_id)
  );
  const state = rawFixture.state || {};
  const incidents = asArray(pickFirst(rawFixture.events, rawFixture.timeline))
    .map((event, index) => normalizeIncident(event, participantContext, index))
    .filter(Boolean);
  const lineups = asArray(rawFixture.lineups)
    .map((entry, index) => normalizeLineupEntry(entry, participantContext, index))
    .filter(Boolean);
  const statistics = asArray(rawFixture.statistics)
    .map((entry, index) => normalizeStatisticEntry(entry, participantContext, index))
    .filter(Boolean);

  return {
    externalRef: pickId(rawFixture.id),
    league,
    season,
    stage,
    roundInfo,
    homeTeam,
    awayTeam,
    startsAt: coerceDate(
      pickFirst(rawFixture.starting_at, rawFixture.start_time, rawFixture.start_date)
    ),
    venue: pickFirst(rawFixture.venue?.name, rawFixture.venue_name),
    round: pickFirst(roundInfo?.name, rawFixture.round_name, rawFixture.round_id),
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
    incidents,
    lineups,
    statistics,
    detailPayloads: {
      incidents: hasOwnKey(rawFixture, "events") || hasOwnKey(rawFixture, "timeline"),
      lineups: hasOwnKey(rawFixture, "lineups"),
      statistics: hasOwnKey(rawFixture, "statistics"),
    },
    metadata: rawFixture,
  };
}

export function normalizeStanding(rawStanding, seasonExternalRef) {
  const team = normalizeTeam(rawStanding.participant || rawStanding.team || rawStanding);

  return {
    seasonExternalRef: pickId(seasonExternalRef),
    scope: pickFirst(rawStanding.scope, rawStanding.type, "OVERALL"),
    groupName: pickFirst(rawStanding.group_name, rawStanding.group, rawStanding.stage_name, null),
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
  const bookmakerInfo = normalizeBookmaker(rawOdds.bookmaker || rawOdds);
  const bookmakerName = bookmakerInfo?.name || pickFirst(rawOdds.bookmaker_name, "SportsMonks");
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
    bookmakerInfo,
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
    externalRef: pickId(rawChannel.id),
    sourceCode: pickFirst(rawChannel.code, rawChannel.channel_code, rawChannel.name),
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
