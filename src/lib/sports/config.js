import {
  DEFAULT_SPORTS_PROVIDER_CODE,
  getSportsProviderCatalogEntry,
  getSportsProviderEnvNamespace,
  normalizeSportsProviderCode,
  sportsProviderSupportsCapability,
} from "./provider-catalog";

const DEFAULT_FIXTURE_DAYS_PAST = 1;
const DEFAULT_FIXTURE_DAYS_AHEAD = 7;
const DEFAULT_MAX_ACTIVE_DETAIL_FIXTURES = 20;
const DEFAULT_MAX_ODDS_FIXTURES = 18;
const DEFAULT_MAX_BROADCAST_FIXTURES = 12;
const DEFAULT_BACKPRESSURE_THRESHOLD = 12;
const DEFAULT_STALE_LIVE_GRACE_MINUTES = 8;
const DEFAULT_PROVIDER_TIMEOUT_MS = 15000;

function parseCsv(value) {
  return [...new Set(
    (value || "")
      .split(",")
      .map((entry) => entry.trim())
  )]
    .filter(Boolean);
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value.trim().toLowerCase() !== "false";
}

function readFirstString(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function buildProviderEnvCandidates(providerCode, suffix) {
  const namespace = getSportsProviderEnvNamespace(providerCode);
  return [
    `SPORTS_PROVIDER_${suffix}`,
    `${namespace}_${suffix}`,
  ];
}

function readProviderEnvString(providerCode, suffix, fallback = "") {
  return readFirstString(...buildProviderEnvCandidates(providerCode, suffix)) || fallback;
}

export function getSportsSyncConfig() {
  const provider = normalizeSportsProviderCode(
    process.env.SPORTS_DATA_PROVIDER || DEFAULT_SPORTS_PROVIDER_CODE
  );
  const descriptor = getSportsProviderCatalogEntry(provider);
  const primarySport =
    readProviderEnvString(provider, "PRIMARY_SPORT") ||
    readFirstString("SPORTS_PRIMARY_SPORT") ||
    descriptor?.defaultPrimarySport ||
    "football";

  return {
    provider,
    providerDescriptor: descriptor,
    providerEnvNamespace: getSportsProviderEnvNamespace(provider),
    adapterFamily: descriptor?.adapterFamily || "custom",
    providerImplemented: Boolean(descriptor?.implemented),
    primarySport,
    supportedSports: descriptor?.sports || [],
    baseUrl:
      readProviderEnvString(provider, "BASE_URL") ||
      descriptor?.defaultBaseUrl ||
      "",
    oddsBaseUrl: readProviderEnvString(provider, "ODDS_BASE_URL"),
    newsBaseUrl: readProviderEnvString(provider, "NEWS_BASE_URL"),
    apiKey: readProviderEnvString(provider, "API_KEY"),
    apiHost: readProviderEnvString(provider, "API_HOST", descriptor?.defaultApiHost || ""),
    authLocation: descriptor?.authLocation || "custom",
    authQueryKey: descriptor?.authQueryKey || null,
    authHeader: readProviderEnvString(provider, "AUTH_HEADER", descriptor?.defaultAuthHeader || ""),
    authScheme: readProviderEnvString(provider, "AUTH_SCHEME", descriptor?.defaultAuthScheme || ""),
    timeoutMs: parseInteger(
      readProviderEnvString(provider, "TIMEOUT_MS") || process.env.SPORTS_PROVIDER_TIMEOUT_MS,
      DEFAULT_PROVIDER_TIMEOUT_MS
    ),
    supports: {
      fixtures: sportsProviderSupportsCapability(descriptor, "fixtures"),
      livescores: sportsProviderSupportsCapability(descriptor, "livescores"),
      standings: sportsProviderSupportsCapability(descriptor, "standings"),
      teams: sportsProviderSupportsCapability(descriptor, "teams"),
      odds: sportsProviderSupportsCapability(descriptor, "odds"),
      broadcast: sportsProviderSupportsCapability(descriptor, "broadcast"),
      news: sportsProviderSupportsCapability(descriptor, "news"),
      predictions: sportsProviderSupportsCapability(descriptor, "predictions"),
    },
    assetHosts: parseCsv(
      readProviderEnvString(provider, "ASSET_HOSTS") ||
        process.env.ASSET_REMOTE_HOSTS ||
        descriptor?.defaultAssetHosts?.join(",") ||
        ""
    ),
    fallbackProviders: parseCsv(process.env.SPORTS_SYNC_FAILOVER_PROVIDERS).map((entry) =>
      normalizeSportsProviderCode(entry, entry)
    ),
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
    oddsEnabled: parseBoolean(
      process.env.SPORTS_SYNC_ODDS_ENABLED,
      sportsProviderSupportsCapability(descriptor, "odds")
    ),
    broadcastEnabled: parseBoolean(
      process.env.SPORTS_SYNC_BROADCAST_ENABLED,
      sportsProviderSupportsCapability(descriptor, "broadcast")
    ),
    predictionsEnabled: parseBoolean(
      process.env.SPORTS_SYNC_PREDICTIONS_ENABLED,
      sportsProviderSupportsCapability(descriptor, "predictions")
    ),
    bookmakerCatalogFixtureLimit: parseInteger(
      process.env.SPORTS_SYNC_BOOKMAKER_CATALOG_FIXTURE_LIMIT,
      DEFAULT_MAX_ODDS_FIXTURES
    ),
    maxPredictionFixturesPerRun: parseInteger(
      process.env.SPORTS_SYNC_MAX_PREDICTION_FIXTURES,
      DEFAULT_MAX_ODDS_FIXTURES
    ),
  };
}

export function requireSportsProviderAccess() {
  const config = getSportsSyncConfig();
  if (!config.providerDescriptor) {
    throw new Error(`Unknown sports provider: ${config.provider}`);
  }

  if (!config.apiKey) {
    throw new Error(
      `${config.provider} credentials are not configured. Set SPORTS_PROVIDER_API_KEY or ${config.providerEnvNamespace}_API_KEY.`
    );
  }
  return config;
}

export function requireSportsApiKey() {
  return requireSportsProviderAccess();
}
