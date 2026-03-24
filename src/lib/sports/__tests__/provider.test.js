import { describe, expect, it } from "vitest";
import {
  getProviderChain,
  getProviderDescriptor,
  getRegisteredSportsProviders,
} from "../provider";

describe("sports provider registry", () => {
  it("exposes registered providers with role, env namespace, and sport metadata", () => {
    const providers = getRegisteredSportsProviders();

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SPORTSMONKS",
          role: "primary",
          envNamespace: "SPORTSMONKS",
          implemented: true,
          sports: ["football"],
        }),
        expect.objectContaining({
          code: "API_SPORTS",
          envNamespace: "API_SPORTS",
          implemented: false,
        }),
        expect.objectContaining({
          code: "SCOREBOARD_BACKUP",
          role: "backup",
        }),
      ])
    );
  });

  it("builds a deduplicated provider chain from primary and fallback codes", () => {
    const chain = getProviderChain("SPORTSMONKS", [
      "SCOREBOARD_BACKUP",
      "SCOREBOARD_BACKUP",
      "SPORTSMONKS_TENNIS",
    ]);

    expect(chain.map((provider) => provider.code)).toEqual([
      "SPORTSMONKS",
      "SCOREBOARD_BACKUP",
      "SPORTSMONKS_TENNIS",
    ]);
  });

  it("returns null for unknown provider descriptors", () => {
    expect(getProviderDescriptor("UNKNOWN")).toBeNull();
  });

  it("normalizes common provider aliases through descriptor lookup", () => {
    expect(getProviderDescriptor("sportmonks")).toMatchObject({
      code: "SPORTSMONKS",
      envNamespace: "SPORTSMONKS",
    });
  });
});
