function getFixtureFreshnessMinutes(fixture, staleGraceMinutes) {
  if (!fixture?.lastSyncedAt) {
    return staleGraceMinutes + 1;
  }

  return Math.max(
    0,
    Math.round((Date.now() - new Date(fixture.lastSyncedAt).getTime()) / (1000 * 60))
  );
}

function getFixturePriority(fixture, staleGraceMinutes) {
  const freshnessMinutes = getFixtureFreshnessMinutes(fixture, staleGraceMinutes);
  const liveBonus = fixture.status === "LIVE" ? 1000 : 0;
  const staleBonus = freshnessMinutes > staleGraceMinutes ? 250 : freshnessMinutes * 8;
  const startsAtDeltaMinutes = fixture.startsAt
    ? Math.abs(new Date(fixture.startsAt).getTime() - Date.now()) / (1000 * 60)
    : 99999;
  const timingBonus = Math.max(0, 180 - Math.round(startsAtDeltaMinutes));

  return liveBonus + staleBonus + timingBonus;
}

function sortFixturesByPriority(fixtures, staleGraceMinutes) {
  return [...fixtures].sort((left, right) => {
    const priorityDifference =
      getFixturePriority(right, staleGraceMinutes) - getFixturePriority(left, staleGraceMinutes);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(left.startsAt || 0).getTime() - new Date(right.startsAt || 0).getTime();
  });
}

function clampBudget(value, minimum, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.round(value));
}

export function buildLiveWindowBackpressurePlan(fixtures, config) {
  const staleGraceMinutes = clampBudget(config?.staleLiveGraceMinutes, 1, 8);
  const prioritizedFixtures = sortFixturesByPriority(fixtures, staleGraceMinutes);
  const liveFixtures = prioritizedFixtures.filter((fixture) => fixture.status === "LIVE");
  const staleLiveFixtures = liveFixtures.filter(
    (fixture) => getFixtureFreshnessMinutes(fixture, staleGraceMinutes) > staleGraceMinutes
  );

  const underPressure =
    liveFixtures.length > clampBudget(config?.liveBackpressureThreshold, 1, 12) ||
    staleLiveFixtures.length > 0;
  const detailBudget = underPressure
    ? clampBudget(Math.ceil((config?.maxActiveFixtureDetails || 20) * 0.6), 6, 12)
    : clampBudget(config?.maxActiveFixtureDetails, 6, 20);
  const oddsBudget = underPressure
    ? clampBudget(Math.ceil((config?.maxOddsFixturesPerRun || 18) * 0.5), 4, 9)
    : clampBudget(config?.maxOddsFixturesPerRun, 4, 18);
  const broadcastBudget = underPressure
    ? clampBudget(Math.ceil((config?.maxBroadcastFixturesPerRun || 12) * 0.5), 3, 6)
    : clampBudget(config?.maxBroadcastFixturesPerRun, 3, 12);

  return {
    underPressure,
    mode: underPressure ? "throttled-live-window" : "nominal",
    prioritizedFixtures,
    detailFixtures: prioritizedFixtures.slice(0, detailBudget),
    oddsFixtures: prioritizedFixtures.slice(0, oddsBudget),
    broadcastFixtures: prioritizedFixtures.slice(0, broadcastBudget),
    summary: {
      totalFixtures: prioritizedFixtures.length,
      liveFixtures: liveFixtures.length,
      staleLiveFixtures: staleLiveFixtures.length,
      detailBudget,
      oddsBudget,
      broadcastBudget,
      staleGraceMinutes,
    },
  };
}
