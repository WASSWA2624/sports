import { getSportsSyncConfig } from "./config";
import {
  getSportsProviderCatalog,
  getSportsProviderCatalogEntry,
  normalizeSportsProviderCode,
} from "./provider-catalog";
import { SportsMonksProvider } from "./providers/sportsmonks";
import { UnimplementedSportsProvider } from "./providers/unimplemented";

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
  "fetchPredictions",
];

const adapterFactories = {
  sportsmonks(config) {
    return new SportsMonksProvider({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      primarySport: config.primarySport,
      timeoutMs: config.timeoutMs,
    });
  },
};

function sanitizeDescriptor(descriptor) {
  return {
    code: descriptor.code,
    name: descriptor.name,
    adapter: descriptor.adapterFamily,
    envNamespace: descriptor.envNamespace,
    authLocation: descriptor.authLocation,
    role: descriptor.role,
    tier: descriptor.tier,
    sports: [...descriptor.sports],
    capabilities: [...descriptor.capabilities],
    fallbackFor: [...(descriptor.fallbackFor || [])],
    implemented: Boolean(descriptor.implemented),
    defaultAssetHosts: [...(descriptor.defaultAssetHosts || [])],
    docsUrl: descriptor.docsUrl || null,
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
  return getSportsProviderCatalog().map(sanitizeDescriptor);
}

export function getProviderDescriptor(providerCode) {
  const descriptor = getSportsProviderCatalogEntry(providerCode);
  return descriptor ? sanitizeDescriptor(descriptor) : null;
}

export function getProviderChain(
  primaryProviderCode = getSportsSyncConfig().provider,
  fallbackCodes = []
) {
  const codes = [
    ...new Set(
      [primaryProviderCode, ...(fallbackCodes || [])]
        .filter(Boolean)
        .map((code) => normalizeSportsProviderCode(code, code))
    ),
  ];

  return codes
    .map((code) => getSportsProviderCatalogEntry(code))
    .filter(Boolean)
    .map(sanitizeDescriptor);
}

export function createSportsProvider(providerCode = getSportsSyncConfig().provider) {
  const config = getSportsSyncConfig(providerCode);
  const normalizedCode = config.provider;
  const descriptor = getSportsProviderCatalogEntry(normalizedCode);

  if (!descriptor) {
    throw new Error(`Unsupported sports provider: ${providerCode}`);
  }

  const factory = adapterFactories[descriptor.adapterFamily];
  const provider =
    descriptor.implemented && typeof factory === "function"
      ? factory(config, descriptor)
      : new UnimplementedSportsProvider(descriptor);

  return verifyProvider(normalizedCode, provider);
}
