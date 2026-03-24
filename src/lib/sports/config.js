const DEFAULT_FIXTURE_DAYS_PAST = 1;
const DEFAULT_FIXTURE_DAYS_AHEAD = 7;
const DEFAULT_MAX_ACTIVE_DETAIL_FIXTURES = 20;
const DEFAULT_MAX_ODDS_FIXTURES = 18;
const DEFAULT_MAX_BROADCAST_FIXTURES = 12;
const DEFAULT_BACKPRESSURE_THRESHOLD = 12;
const DEFAULT_STALE_LIVE_GRACE_MINUTES = 8;

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSportsSyncConfig() {
  return {
    provider: process.env.SPORTS_DATA_PROVIDER || "SPORTSMONKS",
    primarySport: process.env.SPORTS_PRIMARY_SPORT || "football",
    baseUrl: process.env.SPORTSMONKS_BASE_URL || "https://api.sportmonks.com/v3/football",
    apiKey: process.env.SPORTSMONKS_API_KEY || "",
    fallbackProviders: parseCsv(process.env.SPORTS_SYNC_FAILOVER_PROVIDERS),
    trackedLeagueCodes: parseCsv(process.env.SPORTS_SYNC_LEAGUE_CODES),
    trackedSeasonRefs: parseCsv(process.env.SPORTS_SYNC_SEASON_IDS),
    trackedFixtureRefs: parseCsv(process.env.SPORTS_SYNC_FIXTURE_IDS),
    oddsBookmakers: parseCsv(process.env.SPORTS_SYNC_BOOKMAKER_IDS),
    fixtureDaysPast: parseInteger(
      process.env.SPORTS_SYNC_FIXTURE_DAYS_PAST,
      DEFAULT_FIXTURE_DAYS_PAST
    ),
    fixtureDaysAhead: parseInteger(
      process.env.SPORTS_SYNC_FIXTURE_DAYS_AHEAD,
      DEFAULT_FIXTURE_DAYS_AHEAD
    ),
    maxActiveFixtureDetails: parseInteger(
      process.env.SPORTS_SYNC_MAX_ACTIVE_FIXTURE_DETAILS,
      DEFAULT_MAX_ACTIVE_DETAIL_FIXTURES
    ),
    maxOddsFixturesPerRun: parseInteger(
      process.env.SPORTS_SYNC_MAX_ODDS_FIXTURES,
      DEFAULT_MAX_ODDS_FIXTURES
    ),
    maxBroadcastFixturesPerRun: parseInteger(
      process.env.SPORTS_SYNC_MAX_BROADCAST_FIXTURES,
      DEFAULT_MAX_BROADCAST_FIXTURES
    ),
    liveBackpressureThreshold: parseInteger(
      process.env.SPORTS_SYNC_BACKPRESSURE_LIVE_THRESHOLD,
      DEFAULT_BACKPRESSURE_THRESHOLD
    ),
    staleLiveGraceMinutes: parseInteger(
      process.env.SPORTS_SYNC_STALE_LIVE_GRACE_MINUTES,
      DEFAULT_STALE_LIVE_GRACE_MINUTES
    ),
    oddsEnabled: (process.env.SPORTS_SYNC_ODDS_ENABLED || "true") !== "false",
    broadcastEnabled: (process.env.SPORTS_SYNC_BROADCAST_ENABLED || "true") !== "false",
  };
}

export function requireSportsApiKey() {
  const config = getSportsSyncConfig();
  if (!config.apiKey) {
    throw new Error("SPORTSMONKS_API_KEY is not configured.");
  }
  return config;
}
