import { describe, expect, it } from "vitest";
import {
  getProviderChain,
  getProviderDescriptor,
  getRegisteredSportsProviders,
} from "../provider";

describe("sports provider registry", () => {
  it("exposes registered providers with role and sport metadata", () => {
    const providers = getRegisteredSportsProviders();

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SPORTSMONKS",
          role: "primary",
          sports: ["football"],
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
});
