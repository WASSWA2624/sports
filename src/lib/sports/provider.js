import { getSportsSyncConfig } from "./config";
import { SportsMonksProvider } from "./providers/sportsmonks";

const requiredProviderMethods = [
  "fetchTaxonomy",
  "fetchFixtures",
  "fetchLivescores",
  "fetchFixtureDetail",
  "fetchStandings",
  "fetchOdds",
  "fetchTeams",
  "fetchNews",
  "fetchMediaMetadata",
];

const providerRegistry = {
  SPORTSMONKS: {
    code: "SPORTSMONKS",
    name: "SportsMonks Football",
    adapter: "sportsmonks",
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
    create(config) {
      return new SportsMonksProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        primarySport: config.primarySport,
      });
    },
  },
  SPORTSMONKS_BASKETBALL: {
    code: "SPORTSMONKS_BASKETBALL",
    name: "SportsMonks Basketball",
    adapter: "sportsmonks",
    role: "expansion",
    tier: "planned",
    sports: ["basketball"],
    capabilities: ["taxonomy", "fixtures", "standings"],
    notes: "Prepared as a multi-sport expansion slot. Enable only after basketball normalization is added.",
    create() {
      const baseUrl =
        process.env.SPORTSMONKS_BASKETBALL_BASE_URL || "https://api.sportmonks.com/v3/basketball";
      const apiKey = process.env.SPORTSMONKS_BASKETBALL_API_KEY || process.env.SPORTSMONKS_API_KEY || "";

      return new SportsMonksProvider({
        apiKey,
        baseUrl,
        primarySport: "basketball",
      });
    },
  },
  SPORTSMONKS_TENNIS: {
    code: "SPORTSMONKS_TENNIS",
    name: "SportsMonks Tennis",
    adapter: "sportsmonks",
    role: "expansion",
    tier: "planned",
    sports: ["tennis"],
    capabilities: ["taxonomy", "fixtures", "standings"],
    notes: "Prepared as a multi-sport expansion slot. Enable once tennis-specific normalization is available.",
    create() {
      const baseUrl =
        process.env.SPORTSMONKS_TENNIS_BASE_URL || "https://api.sportmonks.com/v3/tennis";
      const apiKey = process.env.SPORTSMONKS_TENNIS_API_KEY || process.env.SPORTSMONKS_API_KEY || "";

      return new SportsMonksProvider({
        apiKey,
        baseUrl,
        primarySport: "tennis",
      });
    },
  },
  SCOREBOARD_BACKUP: {
    code: "SCOREBOARD_BACKUP",
    name: "Scoreboard Backup Feed",
    adapter: "backup",
    role: "backup",
    tier: "prepared",
    sports: ["football", "basketball", "tennis"],
    capabilities: ["livescores", "fixtures", "incident-snapshot"],
    fallbackFor: ["SPORTSMONKS"],
    notes: "Reserved for a licensed backup scoreboard feed or snapshot service during provider outage windows.",
    create() {
      throw new Error(
        "SCOREBOARD_BACKUP is a prepared failover slot and is not connected yet."
      );
    },
  },
};

function sanitizeDescriptor(descriptor) {
  return {
    code: descriptor.code,
    name: descriptor.name,
    adapter: descriptor.adapter,
    role: descriptor.role,
    tier: descriptor.tier,
    sports: [...descriptor.sports],
    capabilities: [...descriptor.capabilities],
    fallbackFor: [...(descriptor.fallbackFor || [])],
    notes: descriptor.notes || null,
  };
}

function verifyProvider(providerCode, provider) {
  for (const methodName of requiredProviderMethods) {
    if (typeof provider[methodName] !== "function") {
      throw new Error(`Provider ${providerCode} is missing method ${methodName}.`);
    }
  }

  return provider;
}

export function getRegisteredSportsProviders() {
  return Object.values(providerRegistry)
    .map(sanitizeDescriptor)
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function getProviderDescriptor(providerCode) {
  return providerRegistry[providerCode] ? sanitizeDescriptor(providerRegistry[providerCode]) : null;
}

export function getProviderChain(primaryProviderCode = getSportsSyncConfig().provider, fallbackCodes = []) {
  const codes = [...new Set([primaryProviderCode, ...(fallbackCodes || [])].filter(Boolean))];

  return codes
    .map((code) => providerRegistry[code])
    .filter(Boolean)
    .map(sanitizeDescriptor);
}

export function createSportsProvider(providerCode = getSportsSyncConfig().provider) {
  const descriptor = providerRegistry[providerCode];

  if (!descriptor) {
    throw new Error(`Unsupported sports provider: ${providerCode}`);
  }

  const provider = descriptor.create(getSportsSyncConfig());
  return verifyProvider(providerCode, provider);
}
