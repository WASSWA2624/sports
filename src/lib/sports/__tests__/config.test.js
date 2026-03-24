import { afterEach, describe, expect, it } from "vitest";
import { getSportsSyncConfig } from "../config";

const originalEnv = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

describe("sports sync config", () => {
  afterEach(() => {
    resetEnv();
  });

  it("resolves provider-specific credentials from the selected provider namespace", () => {
    process.env.SPORTS_DATA_PROVIDER = "API_SPORTS";
    process.env.API_SPORTS_API_KEY = "provider-key";
    process.env.API_SPORTS_BASE_URL = "https://example.test/api-sports";
    process.env.API_SPORTS_AUTH_HEADER = "x-provider-key";
    process.env.API_SPORTS_API_HOST = "api.example.test";

    const config = getSportsSyncConfig();

    expect(config).toMatchObject({
      provider: "API_SPORTS",
      providerEnvNamespace: "API_SPORTS",
      apiKey: "provider-key",
      baseUrl: "https://example.test/api-sports",
      authHeader: "x-provider-key",
      apiHost: "api.example.test",
      authLocation: "header",
      oddsEnabled: true,
      broadcastEnabled: false,
    });
  });

  it("prefers generic override credentials when present", () => {
    process.env.SPORTS_DATA_PROVIDER = "SPORTSMONKS";
    process.env.SPORTS_PROVIDER_API_KEY = "generic-key";
    process.env.SPORTS_PROVIDER_BASE_URL = "https://override.test/provider";

    const config = getSportsSyncConfig();

    expect(config).toMatchObject({
      provider: "SPORTSMONKS",
      apiKey: "generic-key",
      baseUrl: "https://override.test/provider",
    });
  });

  it("falls back to provider defaults for auth metadata when no explicit override exists", () => {
    process.env.SPORTS_DATA_PROVIDER = "API_FOOTBALL";
    process.env.API_FOOTBALL_API_KEY = "provider-key";

    const config = getSportsSyncConfig();

    expect(config).toMatchObject({
      provider: "API_FOOTBALL",
      authLocation: "header",
      authHeader: "x-apisports-key",
      broadcastEnabled: false,
    });
  });

  it("resolves provider-specific asset hosts ahead of the global fallback list", () => {
    process.env.SPORTS_DATA_PROVIDER = "SPORTSMONKS";
    process.env.SPORTSMONKS_API_KEY = "provider-key";
    process.env.SPORTSMONKS_ASSET_HOSTS = "cdn.sportmonks.com,assets.sportsmonks.com";
    process.env.ASSET_REMOTE_HOSTS = "global.example";

    const config = getSportsSyncConfig();

    expect(config.assetHosts).toEqual(["cdn.sportmonks.com", "assets.sportsmonks.com"]);
  });

  it("resolves override config from the explicitly requested provider namespace", () => {
    process.env.SPORTS_DATA_PROVIDER = "SPORTSMONKS";
    process.env.SPORTSMONKS_API_KEY = "primary-key";
    process.env.API_SPORTS_API_KEY = "fallback-key";
    process.env.API_SPORTS_BASE_URL = "https://example.test/api-sports";
    process.env.API_SPORTS_API_HOST = "api.example.test";

    const config = getSportsSyncConfig("API_SPORTS");

    expect(config).toMatchObject({
      provider: "API_SPORTS",
      providerEnvNamespace: "API_SPORTS",
      apiKey: "fallback-key",
      baseUrl: "https://example.test/api-sports",
      apiHost: "api.example.test",
      authLocation: "header",
    });
  });
});
