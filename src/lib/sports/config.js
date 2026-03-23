const DEFAULT_FIXTURE_DAYS_PAST = 1;
const DEFAULT_FIXTURE_DAYS_AHEAD = 7;

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
    provider: "SPORTSMONKS",
    baseUrl: process.env.SPORTSMONKS_BASE_URL || "https://api.sportmonks.com/v3/football",
    apiKey: process.env.SPORTSMONKS_API_KEY || "",
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
    oddsEnabled: (process.env.SPORTS_SYNC_ODDS_ENABLED || "true") !== "false",
  };
}

export function requireSportsApiKey() {
  const config = getSportsSyncConfig();
  if (!config.apiKey) {
    throw new Error("SPORTSMONKS_API_KEY is not configured.");
  }
  return config;
}
