import { formatDictionaryText, getDictionary } from "./dictionaries";

const TERMINAL_STATUSES = new Set(["FINISHED", "POSTPONED", "CANCELLED"]);

const STATUS_PRIORITY = {
  LIVE: 0,
  SCHEDULED: 1,
  FINISHED: 2,
  POSTPONED: 3,
  CANCELLED: 4,
};

const FEATURED_EVENT_MARKERS = [
  "GOAL",
  "PENALTY",
  "RED",
  "VAR",
  "MISS",
  "OWN_GOAL",
];

const STAT_PRIORITY = [
  "possession",
  "shots on target",
  "shots off target",
  "shots total",
  "shots",
  "corners",
  "big chances",
  "xg",
  "passes",
  "fouls",
  "yellow cards",
  "red cards",
];

const LIVE_REFRESH_MS = 20_000;
const KICKOFF_REFRESH_MS = 30_000;
const FINAL_SETTLE_REFRESH_MS = 60_000;
const PRE_MATCH_WINDOW_MS = 25 * 60 * 1000;
const POST_MATCH_SETTLE_MS = 15 * 60 * 1000;
const LIVE_MATCH_BUFFER_MS = 3 * 60 * 60 * 1000;

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

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDisplayValue(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(1);
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const nested = pickFirst(
      value.value,
      value.total,
      value.percentage,
      value.points,
      value.amount
    );
    return normalizeDisplayValue(nested);
  }

  return String(value);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeEventTypeKey(event) {
  return String(
    pickFirst(
      event?.type?.developer_name,
      event?.type?.code,
      event?.type?.name,
      event?.developer_name,
      event?.name,
      event?.type_id,
      "event"
    )
  )
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function normalizeSide(location) {
  if (!location) {
    return null;
  }

  const normalized = String(location).toLowerCase();
  if (normalized.includes("home")) {
    return "home";
  }

  if (normalized.includes("away")) {
    return "away";
  }

  return null;
}

function normalizeStoredSide(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).toLowerCase();
  if (normalized.includes("home")) {
    return "home";
  }

  if (normalized.includes("away")) {
    return "away";
  }

  return null;
}

function getSideIds(side, fixture, payload) {
  const ids = new Set();
  const participants = asArray(payload?.participants);
  const participant = participants.find(
    (entry) =>
      normalizeSide(entry?.meta?.location || entry?.location || entry?.type) === side
  );

  const fixtureTeam =
    side === "home"
      ? fixture?.homeTeam
      : fixture?.awayTeam;

  [participant?.id, participant?.participant_id, participant?.team_id, fixtureTeam?.externalRef, fixtureTeam?.id]
    .filter(Boolean)
    .forEach((value) => ids.add(String(value)));

  return ids;
}

function resolveSideByParticipant(participantId, fixture, payload) {
  if (participantId == null) {
    return null;
  }

  const target = String(participantId);
  if (getSideIds("home", fixture, payload).has(target)) {
    return "home";
  }

  if (getSideIds("away", fixture, payload).has(target)) {
    return "away";
  }

  return null;
}

function formatMinuteLabel(minute, extraMinute) {
  const baseMinute = toNumber(minute);
  const extra = toNumber(extraMinute);

  if (baseMinute == null) {
    return null;
  }

  if (extra != null && extra > 0) {
    return `${baseMinute}+${extra}'`;
  }

  return `${baseMinute}'`;
}

function getEventMinute(event) {
  return pickFirst(
    event?.minute,
    event?.clock?.minute,
    event?.time?.minute,
    event?.data?.minute
  );
}

function getEventExtraMinute(event) {
  return pickFirst(
    event?.extra_minute,
    event?.injury_time,
    event?.clock?.extra_minute,
    event?.time?.extra_minute,
    event?.data?.extra_minute
  );
}

function getEventActor(event) {
  return pickFirst(
    event?.player_name,
    event?.player?.display_name,
    event?.player?.name,
    event?.participant?.name
  );
}

function getEventSecondaryActor(event) {
  return pickFirst(
    event?.related_player_name,
    event?.related_player?.display_name,
    event?.related_player?.name,
    event?.assist_player_name
  );
}

function getEventDescription(event, fallback = "") {
  return pickFirst(
    event?.info,
    event?.description,
    event?.comment,
    event?.note,
    event?.type?.name,
    fallback
  );
}

function getEventSortValue(event) {
  return pickFirst(
    toNumber(event?.sortValue),
    toNumber(getEventMinute(event)),
    toNumber(event?.sort_order),
    toNumber(event?.order),
    0
  );
}

function compareTimelineItems(a, b) {
  const minuteDifference = getEventSortValue(a) - getEventSortValue(b);
  if (minuteDifference !== 0) {
    return minuteDifference;
  }

  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function isFeaturedEvent(typeKey, title) {
  const normalizedTitle = String(title || "").toUpperCase();
  return FEATURED_EVENT_MARKERS.some(
    (marker) => typeKey.includes(marker) || normalizedTitle.includes(marker)
  );
}

function buildTimelineItemsFromRelations(fixture) {
  return asArray(fixture?.incidents)
    .map((incident) => {
      const typeKey = normalizeEventTypeKey({
        type: {
          developer_name: incident?.incidentKey || incident?.type,
          name: incident?.title,
        },
      });
      const title = incident?.title || incident?.type || "Event";

      return {
        id: String(incident?.id || `${title}-${incident?.minute || 0}-${incident?.sortOrder || 0}`),
        minuteLabel: formatMinuteLabel(incident?.minute, incident?.extraMinute),
        side: normalizeStoredSide(incident?.side),
        title,
        typeKey,
        actor: incident?.player?.name || null,
        secondaryActor: incident?.secondaryPlayer?.name || null,
        description: incident?.description || incident?.secondaryLabel || title,
        score: incident?.secondaryLabel || null,
        sortValue: toNumber(incident?.minute) ?? toNumber(incident?.sortOrder) ?? 0,
        featured: isFeaturedEvent(typeKey, title),
      };
    })
    .sort(compareTimelineItems);
}

function buildTimelineItems(fixture, payload, locale = "en") {
  if (Array.isArray(fixture?.incidents) && fixture.incidents.length) {
    return buildTimelineItemsFromRelations(fixture);
  }

  const dictionary = getDictionary(locale);
  const sourceEvents = asArray(payload?.events).length
    ? asArray(payload.events)
    : asArray(payload?.timeline);

  return sourceEvents
    .map((event) => {
      const typeKey = normalizeEventTypeKey(event);
      const title = pickFirst(event?.type?.name, event?.name, dictionary.match);
      const description = getEventDescription(event, dictionary.match);
      const minuteLabel = formatMinuteLabel(getEventMinute(event), getEventExtraMinute(event));
      const side =
        normalizeSide(event?.location) ||
        resolveSideByParticipant(
          pickFirst(event?.participant_id, event?.team_id, event?.participant?.id),
          fixture,
          payload
        );

      return {
        id: String(pickFirst(event?.id, `${title}-${minuteLabel}-${getEventActor(event)}`)),
        minuteLabel,
        side,
        title,
        typeKey,
        actor: getEventActor(event),
        secondaryActor: getEventSecondaryActor(event),
        description,
        score: pickFirst(event?.result, event?.score),
        sortValue: getEventSortValue(event),
        featured: isFeaturedEvent(typeKey, title),
      };
    })
    .sort(compareTimelineItems);
}

function getStatisticLabel(entry, locale = "en") {
  const dictionary = getDictionary(locale);
  const rawLabel = pickFirst(entry?.type?.name, entry?.name, entry?.type?.code, dictionary.statistics);
  const normalized = String(rawLabel).replace(/-/g, " ").toLowerCase();
  const translations = {
    possession: dictionary.statPossession,
    "shots on target": dictionary.statShotsOnTarget,
    "shots off target": dictionary.statShotsOffTarget,
    "shots total": dictionary.statShotsTotal,
    shots: dictionary.statShots,
    corners: dictionary.statCorners,
    "big chances": dictionary.statBigChances,
    xg: dictionary.statExpectedGoals,
    passes: dictionary.statPasses,
    fouls: dictionary.statFouls,
    "yellow cards": dictionary.statYellowCards,
    "red cards": dictionary.statRedCards,
  };

  return translations[normalized] || String(rawLabel).replace(/-/g, " ");
}

function getStatisticValue(entry) {
  return normalizeDisplayValue(
    pickFirst(
      entry?.data?.value,
      entry?.data?.total,
      entry?.data?.percentage,
      entry?.data,
      entry?.value
    )
  );
}

function getStatisticOrderKey(label) {
  const normalized = label.toLowerCase();
  const priorityIndex = STAT_PRIORITY.findIndex((entry) => normalized.includes(entry));
  return priorityIndex === -1 ? STAT_PRIORITY.length + 1 : priorityIndex;
}

function buildStatisticsFromRelations(fixture) {
  return asArray(fixture?.statistics)
    .reduce((accumulator, entry) => {
      const label = entry?.name || "Statistic";
      const key = String(entry?.metricKey || label).toLowerCase();
      const side = normalizeStoredSide(entry?.side);

      if (!side) {
        return accumulator;
      }

      if (!accumulator.has(key)) {
        accumulator.set(key, {
          key,
          label,
          home: null,
          away: null,
          group: entry?.statGroup || "general",
        });
      }

      accumulator.get(key)[side] = normalizeDisplayValue(entry?.value);
      return accumulator;
    }, new Map())
    .values();
}

function buildStatistics(payload, fixture, locale = "en") {
  if (Array.isArray(fixture?.statistics) && fixture.statistics.length) {
    return [...buildStatisticsFromRelations(fixture)]
      .filter((entry) => entry.home != null || entry.away != null)
      .sort((left, right) => {
        const priorityDifference = getStatisticOrderKey(left.label) - getStatisticOrderKey(right.label);
        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return left.label.localeCompare(right.label);
      })
      .slice(0, 10)
      .map((entry) => {
        const homeNumeric = toNumber(entry.home);
        const awayNumeric = toNumber(entry.away);
        const total = (homeNumeric || 0) + (awayNumeric || 0);

        return {
          ...entry,
          homeShare: total > 0 ? Math.round(((homeNumeric || 0) / total) * 100) : 50,
          awayShare: total > 0 ? Math.round(((awayNumeric || 0) / total) * 100) : 50,
        };
      });
  }

  const grouped = new Map();

  for (const entry of asArray(payload?.statistics)) {
    const label = getStatisticLabel(entry, locale);
    const key = label.toLowerCase();
    const side =
      normalizeSide(entry?.location) ||
      resolveSideByParticipant(
        pickFirst(entry?.participant_id, entry?.team_id, entry?.participant?.id),
        fixture,
        payload
      );

    if (!side) {
      continue;
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label,
        home: null,
        away: null,
        group: pickFirst(entry?.type?.stat_group, "general"),
      });
    }

    grouped.get(key)[side] = getStatisticValue(entry);
  }

  return [...grouped.values()]
    .filter((entry) => entry.home != null || entry.away != null)
    .sort((left, right) => {
      const priorityDifference = getStatisticOrderKey(left.label) - getStatisticOrderKey(right.label);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 10)
    .map((entry) => {
      const homeNumeric = toNumber(entry.home);
      const awayNumeric = toNumber(entry.away);
      const total = (homeNumeric || 0) + (awayNumeric || 0);

      return {
        ...entry,
        homeShare: total > 0 ? Math.round(((homeNumeric || 0) / total) * 100) : 50,
        awayShare: total > 0 ? Math.round(((awayNumeric || 0) / total) * 100) : 50,
      };
    });
}

function formatFormationField(value) {
  if (!value) {
    return null;
  }

  return String(value).replace(":", "-");
}

function getFormationForSide(side, payload, fixture) {
  const formations = asArray(payload?.formations);
  const sideIds = getSideIds(side, fixture, payload);
  const match = formations.find((entry) =>
    sideIds.has(String(pickFirst(entry?.participant_id, entry?.team_id, entry?.id)))
  );

  return pickFirst(
    match?.formation,
    match?.data?.formation,
    match?.name,
    null
  );
}

function normalizeLineupPlayer(entry, locale = "en") {
  const dictionary = getDictionary(locale);
  const lineupTypeId = toNumber(entry?.type_id);
  const isStarter =
    lineupTypeId === 11 ||
    (lineupTypeId == null &&
      (entry?.formation_field != null || entry?.formation_position != null));

  return {
    id: String(pickFirst(entry?.id, entry?.player_id, entry?.player_name)),
    name: pickFirst(entry?.player_name, entry?.player?.display_name, entry?.player?.name, dictionary.player),
    jerseyNumber: pickFirst(entry?.jersey_number, entry?.shirt_number, "?"),
    formationField: formatFormationField(entry?.formation_field),
    formationPosition: pickFirst(entry?.formation_position, null),
    position: pickFirst(entry?.position?.name, entry?.position_name, null),
    isStarter,
  };
}

function sortLineupPlayers(left, right) {
  const leftStarterRank = left.isStarter ? 0 : 1;
  const rightStarterRank = right.isStarter ? 0 : 1;
  if (leftStarterRank !== rightStarterRank) {
    return leftStarterRank - rightStarterRank;
  }

  const leftField = left.formationField || "";
  const rightField = right.formationField || "";
  if (leftField !== rightField) {
    return leftField.localeCompare(rightField, undefined, { numeric: true });
  }

  return String(left.jerseyNumber).localeCompare(String(right.jerseyNumber), undefined, {
    numeric: true,
  });
}

function buildLineupSideFromRelations(side, fixture) {
  const players = asArray(fixture?.lineups)
    .filter((entry) => normalizeStoredSide(entry?.side) === side)
    .map((entry) => ({
      id: String(entry?.id || entry?.player?.id || entry?.player?.name || `${side}-player`),
      name: entry?.player?.name || "Player",
      jerseyNumber: entry?.jerseyNumber || "?",
      formationField: entry?.formationSlot || null,
      formationPosition: null,
      position: entry?.positionLabel || null,
      isStarter: Boolean(entry?.isStarter),
    }))
    .sort(sortLineupPlayers);

  return {
    formation: getFormationForSide(side, getFixturePayload(fixture), fixture),
    starters: players.filter((entry) => entry.isStarter),
    bench: players.filter((entry) => !entry.isStarter),
  };
}

function buildLineupSide(side, payload, fixture, locale = "en") {
  if (Array.isArray(fixture?.lineups) && fixture.lineups.length) {
    return buildLineupSideFromRelations(side, fixture);
  }

  const sideIds = getSideIds(side, fixture, payload);
  const players = asArray(payload?.lineups)
    .filter((entry) =>
      sideIds.has(String(pickFirst(entry?.participant_id, entry?.team_id, entry?.id)))
    )
    .map((entry) => normalizeLineupPlayer(entry, locale))
    .sort(sortLineupPlayers);

  return {
    formation: getFormationForSide(side, payload, fixture),
    starters: players.filter((entry) => entry.isStarter),
    bench: players.filter((entry) => !entry.isStarter),
  };
}

function getMaximumEventMinute(timeline) {
  const values = timeline
    .map((entry) => toNumber(entry.minuteLabel?.replace(/'.*$/, "")))
    .filter((value) => value != null);

  return values.length ? Math.max(...values) : null;
}

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

export function getFixturePayload(fixture) {
  return fixture?.metadata || fixture?.resultSnapshot?.payload || {};
}

export function getFixtureMinute(fixture, locale = "en") {
  const payload = getFixturePayload(fixture);
  const timeline = buildTimelineItems(fixture, payload, locale);
  const state = payload?.state || {};

  return formatMinuteLabel(
    pickFirst(state?.minute, state?.current_minute, getMaximumEventMinute(timeline)),
    pickFirst(state?.extra_minute, state?.injury_time)
  );
}

export function buildFixtureRefreshProfile(fixture, locale = "en") {
  const dictionary = getDictionary(locale);
  const now = Date.now();
  const startsAt = parseDate(fixture?.startsAt)?.getTime() || now;
  const snapshotCapturedAt = parseDate(fixture?.resultSnapshot?.capturedAt)?.getTime();

  if (fixture?.status === "LIVE") {
    return {
      enabled: true,
      intervalMs: LIVE_REFRESH_MS,
      until: new Date(Math.max(now, startsAt) + LIVE_MATCH_BUFFER_MS).toISOString(),
      label: dictionary.refreshLiveMatch,
    };
  }

  if (
    fixture?.status === "SCHEDULED" &&
    startsAt - now <= PRE_MATCH_WINDOW_MS &&
    startsAt >= now - PRE_MATCH_WINDOW_MS
  ) {
    return {
      enabled: true,
      intervalMs: KICKOFF_REFRESH_MS,
      until: new Date(startsAt + PRE_MATCH_WINDOW_MS).toISOString(),
      label: dictionary.refreshKickoff,
    };
  }

  if (
    isTerminalStatus(fixture?.status) &&
    snapshotCapturedAt &&
    now - snapshotCapturedAt <= POST_MATCH_SETTLE_MS
  ) {
    return {
      enabled: true,
      intervalMs: FINAL_SETTLE_REFRESH_MS,
      until: new Date(snapshotCapturedAt + POST_MATCH_SETTLE_MS).toISOString(),
      label: dictionary.refreshFinalSettle,
    };
  }

  return {
    enabled: false,
    intervalMs: 0,
    until: null,
    label: isTerminalStatus(fixture?.status) ? dictionary.refreshFrozen : dictionary.refreshInactive,
  };
}

export function buildFeedRefreshProfile(fixtures, locale = "en") {
  const dictionary = getDictionary(locale);
  const profiles = fixtures
    .map((fixture) => buildFixtureRefreshProfile(fixture, locale))
    .filter((profile) => profile.enabled);

  if (!profiles.length) {
    return {
      enabled: false,
      intervalMs: 0,
      until: null,
      label: dictionary.refreshIdle,
    };
  }

  const intervalMs = Math.min(...profiles.map((profile) => profile.intervalMs));
  const until = new Date(
    Math.max(...profiles.map((profile) => new Date(profile.until).getTime()))
  ).toISOString();

  return {
    enabled: true,
    intervalMs,
    until,
    label: profiles.some((profile) => profile.intervalMs === LIVE_REFRESH_MS)
      ? dictionary.refreshLiveFeed
      : dictionary.refreshKickoffFeed,
  };
}

export function buildFixtureWindowSummary(fixtures) {
  return fixtures.reduce(
    (summary, fixture) => {
      summary.total += 1;
      summary[fixture.status] = (summary[fixture.status] || 0) + 1;
      return summary;
    },
    { total: 0, LIVE: 0, SCHEDULED: 0, FINISHED: 0, POSTPONED: 0, CANCELLED: 0 }
  );
}

export function sortFixturesForLiveFeed(fixtures) {
  return [...fixtures].sort((left, right) => {
    const statusDifference =
      (STATUS_PRIORITY[left.status] ?? Number.MAX_SAFE_INTEGER) -
      (STATUS_PRIORITY[right.status] ?? Number.MAX_SAFE_INTEGER);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

export function buildFixtureDetailModules(fixture, locale = "en") {
  const payload = getFixturePayload(fixture);
  const timeline = buildTimelineItems(fixture, payload, locale);
  const statistics = buildStatistics(payload, fixture, locale);
  const lineups = {
    home: buildLineupSide("home", payload, fixture, locale),
    away: buildLineupSide("away", payload, fixture, locale),
  };
  const coverage = {
    timeline: timeline.length ? "available" : "missing",
    statistics: statistics.length ? "available" : "missing",
    lineups:
      lineups.home.starters.length || lineups.away.starters.length ? "available" : "missing",
    keyEvents: timeline.some((entry) => entry.featured) ? "available" : "missing",
  };

  const keyEvents = [...timeline]
    .filter((entry) => entry.featured)
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 6);

  const minuteLabel = getFixtureMinute(fixture);
  const stateText = pickFirst(
    fixture?.resultSnapshot?.statusText,
    payload?.state?.name,
    fixture?.stateReason
  );

  return {
    timeline,
    keyEvents,
    statistics,
    lineups,
    coverage,
    liveState: {
      minuteLabel,
      statusText: stateText,
      reason: pickFirst(fixture?.stateReason, payload?.state?.reason, null),
    },
    refresh: buildFixtureRefreshProfile(fixture, locale),
    resultFreeze: {
      isFrozen: isTerminalStatus(fixture?.status) && Boolean(fixture?.resultSnapshot),
      frozenAt: isTerminalStatus(fixture?.status)
        ? pickFirst(fixture?.resultSnapshot?.capturedAt, fixture?.updatedAt)
        : null,
    },
  };
}

export function buildFixtureIncidentCounts(fixture, locale = "en") {
  const timeline = buildTimelineItems(fixture, getFixturePayload(fixture), locale);
  return timeline.reduce(
    (summary, entry) => {
      if (entry.typeKey.includes("GOAL")) {
        summary.goals += 1;
      }
      if (entry.typeKey.includes("YELLOW")) {
        summary.yellowCards += 1;
      }
      if (entry.typeKey.includes("RED")) {
        summary.redCards += 1;
      }
      if (entry.typeKey.includes("VAR")) {
        summary.varChecks += 1;
      }
      return summary;
    },
    { goals: 0, yellowCards: 0, redCards: 0, varChecks: 0 }
  );
}

export function buildFixtureIncidentIndicators(fixture, locale = "en") {
  const dictionary = getDictionary(locale);
  const counts = buildFixtureIncidentCounts(fixture, locale);

  return [
    counts.goals ? formatDictionaryText(dictionary.incidentGoals, { count: counts.goals }) : null,
    counts.yellowCards
      ? formatDictionaryText(dictionary.incidentYellows, { count: counts.yellowCards })
      : null,
    counts.redCards ? formatDictionaryText(dictionary.incidentReds, { count: counts.redCards }) : null,
    counts.varChecks ? formatDictionaryText(dictionary.incidentVar, { count: counts.varChecks }) : null,
  ].filter(Boolean);
}

export function buildFixtureCardSummary(fixture, locale = "en") {
  const timeline = buildTimelineItems(fixture, getFixturePayload(fixture), locale);

  return timeline.reduce(
    (summary, entry) => {
      const side =
        entry.side === "home" || entry.side === "away"
          ? entry.side
          : null;

      if (!side) {
        return summary;
      }

      if (entry.typeKey.includes("YELLOW")) {
        summary[side].yellow += 1;
      }

      if (entry.typeKey.includes("RED")) {
        summary[side].red += 1;
      }

      return summary;
    },
    {
      home: { yellow: 0, red: 0 },
      away: { yellow: 0, red: 0 },
    }
  );
}

export function buildFixtureKeyMomentLabel(fixture, locale = "en") {
  const timeline = [...buildTimelineItems(fixture, getFixturePayload(fixture), locale)].sort(
    (left, right) => right.sortValue - left.sortValue
  );
  const primary = timeline.find((entry) => entry.featured) || timeline[0];

  if (!primary) {
    return null;
  }

  const suffix = primary.actor || primary.score || primary.description || null;
  const lead = [primary.minuteLabel, primary.title].filter(Boolean).join(" ");

  if (!lead) {
    return suffix;
  }

  return suffix ? `${lead} - ${suffix}` : lead;
}
