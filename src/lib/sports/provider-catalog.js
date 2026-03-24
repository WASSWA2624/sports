export const DEFAULT_SPORTS_PROVIDER_CODE = "SPORTSMONKS";

const CAPABILITY_ALIASES = {
  taxonomy: ["taxonomy", "reference-data", "catalog"],
  fixtures: ["fixtures", "matches", "results", "scores"],
  livescores: ["livescores", "livescore", "scores"],
  "fixture-detail": ["fixture-detail", "details", "match-center"],
  standings: ["standings", "tables"],
  teams: ["teams", "participants", "players"],
  odds: ["odds", "markets", "market", "exchange-odds", "betting-feeds", "spreads", "props"],
  broadcast: ["broadcast", "media-metadata", "tv", "tv-stations", "widgets"],
  news: ["news", "news-hook"],
  predictions: ["predictions", "prediction", "tips", "pick", "recommendations"],
};

const PROVIDER_DEFINITIONS = [
  {
    code: "SPORTSMONKS",
    aliases: ["SPORTMONKS", "SPORTS_MONKS"],
    name: "SportsMonks",
    adapterFamily: "sportsmonks",
    envNamespace: "SPORTSMONKS",
    role: "primary",
    tier: "live",
    sports: ["football"],
    capabilities: [
      "taxonomy",
      "fixtures",
      "livescores",
      "fixture-detail",
      "standings",
      "odds",
      "broadcast",
      "teams",
      "news-hook",
    ],
    implemented: true,
    defaultPrimarySport: "football",
    defaultBaseUrl: "https://api.sportmonks.com/v3/football",
    defaultAssetHosts: ["cdn.sportmonks.com", "assets.sportsmonks.com"],
    authLocation: "query",
    authQueryKey: "api_token",
    docsUrl: "https://www.sportmonks.com/",
  },
  {
    code: "SPORTSMONKS_BASKETBALL",
    name: "SportsMonks Basketball",
    adapterFamily: "sportsmonks",
    envNamespace: "SPORTSMONKS_BASKETBALL",
    role: "expansion",
    tier: "planned",
    sports: ["basketball"],
    capabilities: ["taxonomy", "fixtures", "standings"],
    implemented: false,
    defaultPrimarySport: "basketball",
    defaultBaseUrl: "https://api.sportmonks.com/v3/basketball",
    defaultAssetHosts: ["cdn.sportmonks.com", "assets.sportsmonks.com"],
    authLocation: "query",
    authQueryKey: "api_token",
    docsUrl: "https://www.sportmonks.com/",
    notes: "Prepared expansion slot. Enable once basketball normalization and read models are complete.",
  },
  {
    code: "SPORTSMONKS_TENNIS",
    name: "SportsMonks Tennis",
    adapterFamily: "sportsmonks",
    envNamespace: "SPORTSMONKS_TENNIS",
    role: "expansion",
    tier: "planned",
    sports: ["tennis"],
    capabilities: ["taxonomy", "fixtures", "standings"],
    implemented: false,
    defaultPrimarySport: "tennis",
    defaultBaseUrl: "https://api.sportmonks.com/v3/tennis",
    defaultAssetHosts: ["cdn.sportmonks.com", "assets.sportsmonks.com"],
    authLocation: "query",
    authQueryKey: "api_token",
    docsUrl: "https://www.sportmonks.com/",
    notes: "Prepared expansion slot. Enable once tennis normalization and read models are complete.",
  },
  {
    code: "API_SPORTS",
    aliases: ["API-SPORTS", "APISPORTS"],
    name: "API-Sports",
    adapterFamily: "api-sports",
    envNamespace: "API_SPORTS",
    role: "alternative",
    tier: "catalog",
    sports: ["football", "basketball", "f1", "mma"],
    capabilities: ["fixtures", "livescores", "standings", "odds", "statistics", "teams"],
    implemented: false,
    defaultPrimarySport: "football",
    authLocation: "header",
    defaultAuthHeader: "x-apisports-key",
    docsUrl: "https://api-sports.io/",
  },
  {
    code: "API_FOOTBALL",
    aliases: ["API-FOOTBALL", "APIFOOTBALL"],
    name: "API-Football",
    adapterFamily: "api-sports",
    envNamespace: "API_FOOTBALL",
    role: "alternative",
    tier: "catalog",
    sports: ["football"],
    capabilities: ["fixtures", "livescores", "standings", "odds", "players", "statistics"],
    implemented: false,
    defaultPrimarySport: "football",
    authLocation: "header",
    defaultAuthHeader: "x-apisports-key",
    docsUrl: "https://www.api-football.com/",
  },
  {
    code: "SPORTSDATAIO",
    aliases: ["SPORTS_DATA_IO"],
    name: "SportsDataIO",
    adapterFamily: "sportsdataio",
    envNamespace: "SPORTSDATAIO",
    role: "alternative",
    tier: "catalog",
    sports: ["football", "basketball", "baseball", "hockey"],
    capabilities: ["fixtures", "scores", "projections", "odds", "news", "images"],
    implemented: false,
    docsUrl: "https://sportsdata.io/",
  },
  {
    code: "THE_ODDS_API",
    aliases: ["ODDS_API", "THEODDSAPI"],
    name: "The Odds API",
    adapterFamily: "the-odds-api",
    envNamespace: "THE_ODDS_API",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "results"],
    implemented: false,
    docsUrl: "https://the-odds-api.com/",
  },
  {
    code: "GOALSERVE",
    name: "GoalServe",
    adapterFamily: "goalserve",
    envNamespace: "GOALSERVE",
    role: "alternative",
    tier: "catalog",
    sports: ["football", "basketball", "tennis"],
    capabilities: ["livescores", "odds", "results", "statistics"],
    implemented: false,
    docsUrl: "https://www.goalserve.com/",
  },
  {
    code: "SPORTS_GAME_ODDS",
    aliases: ["SPORTSGAMEODDS"],
    name: "Sports Game Odds",
    adapterFamily: "sportsgameodds",
    envNamespace: "SPORTS_GAME_ODDS",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "results", "props"],
    implemented: false,
    docsUrl: "https://sportsgameodds.com/",
  },
  {
    code: "SPORTAPI",
    aliases: ["SPORTAPI_AI"],
    name: "SportAPI",
    adapterFamily: "sportapi",
    envNamespace: "SPORTAPI",
    role: "alternative",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["livescores", "fixtures", "statistics"],
    implemented: false,
    docsUrl: "https://sportapi.ai/",
  },
  {
    code: "JSON_ODDS",
    aliases: ["JSONODDS"],
    name: "JsonOdds",
    adapterFamily: "jsonodds",
    envNamespace: "JSON_ODDS",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["matches", "odds", "scores", "spreads"],
    implemented: false,
    docsUrl: "https://jsonodds.com/",
  },
  {
    code: "ALLSPORTSAPI",
    aliases: ["ALL_SPORTS_API"],
    name: "AllSportsAPI",
    adapterFamily: "allsportsapi",
    envNamespace: "ALLSPORTSAPI",
    role: "alternative",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["livescores", "fixtures", "statistics"],
    implemented: false,
    docsUrl: "https://allsportsapi.com/",
  },
  {
    code: "SOCCERDATA_API",
    aliases: ["SOCCERDATAAPI"],
    name: "Soccerdata API",
    adapterFamily: "soccerdataapi",
    envNamespace: "SOCCERDATA_API",
    role: "alternative",
    tier: "catalog",
    sports: ["football"],
    capabilities: ["odds", "statistics", "predictions", "injuries", "weather"],
    implemented: false,
    docsUrl: "https://soccerdataapi.com/",
  },
  {
    code: "SPORTS_OPEN_DATA",
    aliases: ["SPORTSOPENDATA", "SPORTS_OPEN_DATA_API"],
    name: "Sports Open Data API",
    adapterFamily: "sports-open-data",
    envNamespace: "SPORTS_OPEN_DATA",
    role: "community",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["statistics", "odds"],
    implemented: false,
    docsUrl: "https://sportsopendata.net/",
  },
  {
    code: "ODDSJAM",
    name: "OddsJam API",
    adapterFamily: "oddsjam",
    envNamespace: "ODDSJAM",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "arbitrage"],
    implemented: false,
    docsUrl: "https://oddsjam.com/api",
  },
  {
    code: "EXEFEED",
    name: "Exefeed",
    adapterFamily: "exefeed",
    envNamespace: "EXEFEED",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "betting-feeds"],
    implemented: false,
    docsUrl: "https://exefeed.com/",
  },
  {
    code: "BETFAIR",
    name: "Betfair API",
    adapterFamily: "betfair",
    envNamespace: "BETFAIR",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["exchange-odds", "markets", "trading-data"],
    implemented: false,
    docsUrl: "https://developer.betfair.com/",
  },
  {
    code: "SPORTDATAAPI",
    aliases: ["SPORT_DATA_API"],
    name: "SportdataAPI",
    adapterFamily: "sportdataapi",
    envNamespace: "SPORTDATAAPI",
    role: "alternative",
    tier: "catalog",
    sports: ["football"],
    capabilities: ["statistics", "predictions", "fixtures"],
    implemented: false,
    docsUrl: "https://sportdataapi.com/",
  },
  {
    code: "RAPIDAPI_SPORTS",
    aliases: ["RAPIDAPI", "RAPID_API_SPORTS"],
    name: "RapidAPI Sports Marketplace",
    adapterFamily: "rapidapi-sports",
    envNamespace: "RAPIDAPI_SPORTS",
    role: "marketplace",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["proxy-marketplace", "multi-feed"],
    implemented: false,
    authLocation: "header",
    defaultAuthHeader: "x-rapidapi-key",
    docsUrl: "https://rapidapi.com/collection/sports-apis",
  },
  {
    code: "ERGAST_F1",
    aliases: ["ERGAST"],
    name: "Ergast F1 API",
    adapterFamily: "ergast",
    envNamespace: "ERGAST_F1",
    role: "niche",
    tier: "catalog",
    sports: ["f1"],
    capabilities: ["fixtures", "results", "standings"],
    implemented: false,
    docsUrl: "http://ergast.com/mrd/",
  },
  {
    code: "ESPN_UNOFFICIAL",
    aliases: ["ESPN_API"],
    name: "ESPN API (unofficial)",
    adapterFamily: "espn-unofficial",
    envNamespace: "ESPN_UNOFFICIAL",
    role: "alternative",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["scores", "news", "statistics"],
    implemented: false,
    docsUrl: "https://site.api.espn.com/apis",
  },
  {
    code: "PINNACLE",
    aliases: ["PINNACLE_API"],
    name: "Pinnacle Sports API",
    adapterFamily: "pinnacle",
    envNamespace: "PINNACLE",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "markets"],
    implemented: false,
    docsUrl: "https://github.com/pinnacleapi",
  },
  {
    code: "SPORTRADAR",
    name: "Sportradar",
    adapterFamily: "sportradar",
    envNamespace: "SPORTRADAR",
    role: "enterprise",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "scores", "statistics", "news"],
    implemented: false,
    docsUrl: "https://developer.sportradar.com/",
  },
  {
    code: "STATS_PERFORM",
    aliases: ["OPTADATA", "OPTA", "STATS_PERFORM_OPTA"],
    name: "Stats Perform",
    adapterFamily: "stats-perform",
    envNamespace: "STATS_PERFORM",
    role: "enterprise",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["statistics", "analytics", "news"],
    implemented: false,
    docsUrl: "https://www.statsperform.com/",
  },
  {
    code: "BET365_UNOFFICIAL",
    aliases: ["BET365"],
    name: "Bet365 API (unofficial)",
    adapterFamily: "bet365-unofficial",
    envNamespace: "BET365_UNOFFICIAL",
    role: "odds-feed",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "results"],
    implemented: false,
  },
  {
    code: "FEEDCONSTRUCT",
    name: "FeedConstruct",
    adapterFamily: "feedconstruct",
    envNamespace: "FEEDCONSTRUCT",
    role: "enterprise",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["odds", "live-scouting", "statistics"],
    implemented: false,
    docsUrl: "https://feedconstruct.com/",
  },
  {
    code: "SPORTSCORE",
    aliases: ["SPORTSCORE_IO"],
    name: "Sportscore API",
    adapterFamily: "sportscore",
    envNamespace: "SPORTSCORE",
    role: "alternative",
    tier: "catalog",
    sports: ["multi-sport"],
    capabilities: ["livescores", "odds", "widgets"],
    implemented: false,
    docsUrl: "https://sportscore.io/",
  },
  {
    code: "SCOREBOARD_BACKUP",
    name: "Scoreboard Backup Feed",
    adapterFamily: "backup",
    envNamespace: "SCOREBOARD_BACKUP",
    role: "backup",
    tier: "prepared",
    sports: ["football", "basketball", "tennis"],
    capabilities: ["livescores", "fixtures", "incident-snapshot"],
    fallbackFor: ["SPORTSMONKS"],
    implemented: false,
    notes: "Reserved failover slot for a licensed backup scoreboard feed.",
  },
];

const PROVIDER_BY_CODE = new Map();
const PROVIDER_ALIAS_TO_CODE = new Map();

function slugToCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeProviderDefinition(definition) {
  return {
    code: definition.code,
    name: definition.name,
    adapterFamily: definition.adapterFamily,
    envNamespace: definition.envNamespace || definition.code,
    role: definition.role || "alternative",
    tier: definition.tier || "catalog",
    sports: [...(definition.sports || [])],
    capabilities: [...(definition.capabilities || [])],
    fallbackFor: [...(definition.fallbackFor || [])],
    implemented: Boolean(definition.implemented),
    defaultPrimarySport: definition.defaultPrimarySport || definition.sports?.[0] || "football",
    defaultBaseUrl: definition.defaultBaseUrl || "",
    authLocation: definition.authLocation || "custom",
    authQueryKey: definition.authQueryKey || null,
    defaultAuthHeader: definition.defaultAuthHeader || "",
    defaultAuthScheme: definition.defaultAuthScheme || "",
    defaultApiHost: definition.defaultApiHost || "",
    defaultAssetHosts: [...(definition.defaultAssetHosts || [])],
    docsUrl: definition.docsUrl || null,
    notes: definition.notes || null,
  };
}

for (const definition of PROVIDER_DEFINITIONS) {
  const sanitized = sanitizeProviderDefinition(definition);
  PROVIDER_BY_CODE.set(sanitized.code, sanitized);
  PROVIDER_ALIAS_TO_CODE.set(sanitized.code, sanitized.code);

  for (const alias of definition.aliases || []) {
    PROVIDER_ALIAS_TO_CODE.set(slugToCode(alias), sanitized.code);
  }
}

export function normalizeSportsProviderCode(value, fallback = DEFAULT_SPORTS_PROVIDER_CODE) {
  const normalized = slugToCode(value);
  if (!normalized) {
    return fallback;
  }

  return PROVIDER_ALIAS_TO_CODE.get(normalized) || normalized;
}

export function getSportsProviderCatalog() {
  return [...PROVIDER_BY_CODE.values()].sort((left, right) => left.code.localeCompare(right.code));
}

export function getSportsProviderCatalogEntry(providerCode) {
  return PROVIDER_BY_CODE.get(normalizeSportsProviderCode(providerCode)) || null;
}

export function getSportsProviderEnvNamespace(providerCode) {
  return getSportsProviderCatalogEntry(providerCode)?.envNamespace || normalizeSportsProviderCode(providerCode);
}

export function isSportsProviderRegistered(providerCode) {
  return Boolean(getSportsProviderCatalogEntry(providerCode));
}

export function isSportsProviderImplemented(providerCode) {
  return Boolean(getSportsProviderCatalogEntry(providerCode)?.implemented);
}

export function sportsProviderSupportsCapability(provider, capability) {
  const descriptor =
    typeof provider === "string" ? getSportsProviderCatalogEntry(provider) : provider || null;
  if (!descriptor) {
    return false;
  }

  const requested = slugToCode(capability).toLowerCase();
  if (!requested) {
    return false;
  }

  const supported = new Set(
    (descriptor.capabilities || []).map((entry) => slugToCode(entry).toLowerCase())
  );
  const aliases = CAPABILITY_ALIASES[requested] || [requested];

  return aliases.some((entry) => supported.has(slugToCode(entry).toLowerCase()));
}
