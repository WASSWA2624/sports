import { getSportsSyncConfig } from "./config";
import { SportsMonksProvider } from "./providers/sportsmonks";

const providerFactories = {
  SPORTSMONKS: () => new SportsMonksProvider(),
};

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

export function createSportsProvider(providerCode = getSportsSyncConfig().provider) {
  const factory = providerFactories[providerCode];

  if (!factory) {
    throw new Error(`Unsupported sports provider: ${providerCode}`);
  }

  const provider = factory();
  for (const methodName of requiredProviderMethods) {
    if (typeof provider[methodName] !== "function") {
      throw new Error(`Provider ${providerCode} is missing method ${methodName}.`);
    }
  }

  return provider;
}
