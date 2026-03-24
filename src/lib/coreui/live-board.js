import { buildStandingTable } from "./competition-standings";
import { getDictionary } from "./dictionaries";
import { buildFixtureIncidentCounts, buildFixtureIncidentIndicators, buildFixtureRefreshProfile, getFixtureMinute, isTerminalStatus } from "./live-detail";
import { formatFixtureStatus, formatSnapshotTime } from "./format";

const LIVE_STALE_MS = 1000 * 60 * 8;

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value?.toNumber === "function") {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value != null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatPrice(value, locale = "en") {
  const parsed = toNumber(value);
  if (parsed == null) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function hasScore(snapshot) {
  return Number.isFinite(snapshot?.homeScore) && Number.isFinite(snapshot?.awayScore);
}

function isLiveStale(fixture) {
  if (fixture?.status !== "LIVE") {
    return false;
  }

  if (!fixture?.lastSyncedAt) {
    return true;
  }

  return Date.now() - new Date(fixture.lastSyncedAt).getTime() > LIVE_STALE_MS;
}

function buildHighlightTeamIds(fixtures = []) {
  return new Set(
    fixtures
      .flatMap((fixture) => [fixture.homeTeam?.id, fixture.awayTeam?.id])
      .filter(Boolean)
  );
}

export function buildBoardGroupSummary(fixtures = []) {
  return fixtures.reduce(
    (summary, fixture) => {
      summary.total += 1;
      summary[fixture.status] = (summary[fixture.status] || 0) + 1;
      return summary;
    },
    { total: 0, LIVE: 0, SCHEDULED: 0, FINISHED: 0, POSTPONED: 0, CANCELLED: 0 }
  );
}

export function buildLiveBoardFixtureSignals(fixture, locale = "en") {
  const dictionary = getDictionary(locale);
  const refresh = buildFixtureRefreshProfile(fixture, locale);
  const minuteLabel = fixture?.status === "LIVE" ? getFixtureMinute(fixture, locale) : null;
  const stale = isLiveStale(fixture);
  const snapshotCapturedAt = fixture?.resultSnapshot?.capturedAt || null;
  const incidentCounts = buildFixtureIncidentCounts(fixture, locale);

  return {
    minuteLabel,
    statusLabel: minuteLabel || formatFixtureStatus(fixture?.status, locale),
    refresh,
    stale,
    staleLabel: stale ? dictionary.liveRowStale : null,
    incidentCounts,
    incidentIndicators: buildFixtureIncidentIndicators(fixture, locale),
    isTerminal: isTerminalStatus(fixture?.status),
    isFrozen: isTerminalStatus(fixture?.status) && Boolean(snapshotCapturedAt) && !refresh.enabled,
    isSettling: isTerminalStatus(fixture?.status) && Boolean(snapshotCapturedAt) && refresh.enabled,
    freezeLabel: snapshotCapturedAt
      ? `${dictionary.snapshotFrozenLabel.replace("{time}", formatSnapshotTime(snapshotCapturedAt, locale))}`
      : null,
  };
}

export function buildGroupStandingsPreview({
  fixtures = [],
  standings = [],
  teams = [],
  rowLimit = 4,
} = {}) {
  if (!standings.length && !teams.length) {
    return {
      available: false,
      rows: [],
      selectedView: "overall",
      hasLiveData: false,
    };
  }

  const baseTable = buildStandingTable({
    teams,
    standings,
    fixtures,
    view: "overall",
  });
  const liveTable = buildStandingTable({
    teams,
    standings,
    fixtures,
    view: fixtures.some((fixture) => fixture.status === "LIVE") ? "live" : "overall",
  });
  const highlightTeamIds = buildHighlightTeamIds(fixtures);
  const previousPositions = new Map(
    baseTable.rows.map((row) => [row.team.id, row.position])
  );

  return {
    available: liveTable.rows.length > 0,
    rows: liveTable.rows.slice(0, rowLimit).map((row) => ({
      ...row,
      movement:
        previousPositions.has(row.team.id) && previousPositions.get(row.team.id) != null
          ? previousPositions.get(row.team.id) - row.position
          : 0,
      isHighlighted: highlightTeamIds.has(row.team.id),
    })),
    selectedView: liveTable.selectedView,
    hasLiveData: liveTable.hasLiveData,
  };
}

function pickBestMarketSelection(markets = []) {
  return markets.reduce((best, market) => {
    const selections = (market?.selections || []).filter((selection) => selection?.isActive !== false);
    const topSelection = selections.reduce((selectionBest, selection) => {
      const selectionPrice = toNumber(selection?.priceDecimal);
      const currentBestPrice = toNumber(selectionBest?.priceDecimal);

      if (selectionPrice == null) {
        return selectionBest;
      }

      if (currentBestPrice == null || selectionPrice > currentBestPrice) {
        return selection;
      }

      return selectionBest;
    }, null);

    if (!topSelection) {
      return best;
    }

    const price = toNumber(topSelection.priceDecimal);
    const bestPrice = toNumber(best?.selection?.priceDecimal);

    if (bestPrice == null || price > bestPrice) {
      return {
        market,
        selection: topSelection,
      };
    }

    return best;
  }, null);
}

export function buildBestOddsCards(fixtures = [], { locale = "en" } = {}) {
  return fixtures
    .map((fixture) => {
      const picked = pickBestMarketSelection(fixture?.oddsMarkets || []);
      if (!picked?.selection || !picked.market) {
        return null;
      }

      return {
        key: fixture.id,
        fixtureId: fixture.id,
        fixtureRef: fixture.externalRef || fixture.id,
        fixtureLabel: `${fixture.homeTeam?.name || "Home"} vs ${fixture.awayTeam?.name || "Away"}`,
        competitionName: fixture.league?.name || null,
        bookmakerId: picked.market.bookmakerId || null,
        bookmaker: picked.market.bookmaker,
        marketType: picked.market.marketType,
        selectionLabel: picked.selection.label,
        priceDecimal: toNumber(picked.selection.priceDecimal),
        priceLabel: formatPrice(picked.selection.priceDecimal, locale),
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right.priceDecimal || 0) - (left.priceDecimal || 0));
}

export function buildHighOddsCards(
  fixtures = [],
  { locale = "en", minimumPrice = 3 } = {}
) {
  return buildBestOddsCards(fixtures, { locale }).filter(
    (entry) => (entry.priceDecimal || 0) >= minimumPrice
  );
}

export function buildPredictionCards(predictions = [], { locale = "en" } = {}) {
  return predictions
    .map((prediction) => ({
      key: prediction.id || prediction.key,
      predictionKey: prediction.key,
      title: prediction.title,
      summary: prediction.summary || null,
      recommendationType: prediction.recommendationType,
      competitionName: prediction.competition?.name || null,
      fixtureId: prediction.fixture?.id || prediction.fixtureId || null,
      fixtureRef:
        prediction.fixture?.externalRef || prediction.fixture?.id || prediction.fixtureId || null,
      fixtureLabel:
        prediction.fixture?.homeTeam && prediction.fixture?.awayTeam
          ? `${prediction.fixture.homeTeam.name} vs ${prediction.fixture.awayTeam.name}`
          : null,
      bookmakerId: prediction.bookmaker?.id || prediction.bookmakerId || null,
      bookmaker: prediction.bookmaker?.shortName || prediction.bookmaker?.name || null,
      marketType: prediction.marketType || null,
      selectionLabel: prediction.selectionLabel || null,
      priceDecimal: toNumber(prediction.priceDecimal),
      priceLabel: formatPrice(prediction.priceDecimal, locale),
      confidence: toNumber(prediction.confidence),
      confidenceLabel:
        prediction.confidence != null ? `${Math.round(toNumber(prediction.confidence) || 0)}%` : null,
      edgeScore: toNumber(prediction.edgeScore),
      line: prediction.line == null ? null : String(prediction.line),
      publishedAt: prediction.publishedAt || null,
    }))
    .filter((prediction) => prediction.title);
}

export function buildCompletedFixtureSummary(fixtures = [], locale = "en") {
  const dictionary = getDictionary(locale);
  const completedFixtures = fixtures.filter(
    (fixture) => isTerminalStatus(fixture.status) && hasScore(fixture.resultSnapshot)
  );

  if (!completedFixtures.length) {
    return null;
  }

  const frozenCount = completedFixtures.filter((fixture) =>
    buildLiveBoardFixtureSignals(fixture, locale).isFrozen
  ).length;

  return {
    completedCount: completedFixtures.length,
    frozenCount,
    label:
      frozenCount === completedFixtures.length
        ? dictionary.liveResultsFrozen
        : dictionary.liveResultsSettling,
  };
}
