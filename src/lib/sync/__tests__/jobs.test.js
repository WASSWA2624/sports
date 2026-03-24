import { beforeEach, describe, expect, it, vi } from "vitest";

const createSportsProvider = vi.fn();
const getProviderDescriptor = vi.fn((providerCode) => {
  const descriptors = {
    SPORTSMONKS: {
      code: "SPORTSMONKS",
      name: "SportsMonks",
      role: "primary",
      tier: "live",
      implemented: true,
    },
    SCOREBOARD_BACKUP: {
      code: "SCOREBOARD_BACKUP",
      name: "Scoreboard Backup",
      role: "backup",
      tier: "prepared",
      implemented: true,
    },
  };

  return descriptors[providerCode] || null;
});

vi.mock("../../sports/config", () => ({
  getSportsSyncConfig: vi.fn(() => ({
    provider: "SPORTSMONKS",
    fallbackProviders: ["SCOREBOARD_BACKUP"],
  })),
}));

vi.mock("../../control-plane", () => ({
  ensureProviderIsActive: vi.fn(),
}));

vi.mock("../../db", () => ({
  db: {},
}));

vi.mock("../../operations", () => ({
  recordSyncPressureEvent: vi.fn(),
}));

vi.mock("../../sports/provider", () => ({
  createSportsProvider,
  getProviderChain: vi.fn(() => []),
  getProviderDescriptor,
}));

vi.mock("../../sports/repository", () => ({
  persistFixtureBatch: vi.fn(),
  persistOddsBatch: vi.fn(),
  persistPredictionBatch: vi.fn(),
  persistStandingsBatch: vi.fn(),
  persistTeamBatch: vi.fn(),
  replaceBroadcastChannels: vi.fn(),
}));

vi.mock("../service", () => ({
  completeSyncJob: vi.fn(),
  ensureSyncProviderChain: vi.fn(),
  failSyncJob: vi.fn(),
  getCheckpoint: vi.fn(),
  saveCheckpoint: vi.fn(),
  startSyncJob: vi.fn(),
}));

const { createSyncProviderRuntime, getSyncProviderCodes } = await import("../jobs.js");

describe("sync provider runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates configured provider codes", () => {
    expect(
      getSyncProviderCodes({
        provider: "SPORTSMONKS",
        fallbackProviders: ["SCOREBOARD_BACKUP", "SCOREBOARD_BACKUP"],
      })
    ).toEqual(["SPORTSMONKS", "SCOREBOARD_BACKUP"]);
  });

  it("fails over to the next configured provider when the primary throws", async () => {
    createSportsProvider.mockImplementation((providerCode) => {
      if (providerCode === "SPORTSMONKS") {
        return {
          fetchLivescores: vi.fn(async () => {
            throw new Error("Primary feed down");
          }),
        };
      }

      return {
        fetchLivescores: vi.fn(async () => ["fallback-fixture"]),
      };
    });

    const runtime = createSyncProviderRuntime({
      provider: "SPORTSMONKS",
      fallbackProviders: ["SCOREBOARD_BACKUP"],
    });
    const outcome = await runtime.execute("fixtures-live", (provider) =>
      provider.fetchLivescores()
    );

    expect(outcome.providerCode).toBe("SCOREBOARD_BACKUP");
    expect(outcome.result).toEqual(["fallback-fixture"]);
    expect(outcome.attempts).toEqual([
      expect.objectContaining({
        providerCode: "SPORTSMONKS",
        status: "failed",
        error: "Primary feed down",
      }),
      expect.objectContaining({
        providerCode: "SCOREBOARD_BACKUP",
        status: "success",
      }),
    ]);
  });

  it("returns aggregated provider failures when the whole chain fails", async () => {
    createSportsProvider.mockImplementation((providerCode) => ({
      fetchLivescores: vi.fn(async () => {
        throw new Error(`${providerCode} unavailable`);
      }),
    }));

    const runtime = createSyncProviderRuntime({
      provider: "SPORTSMONKS",
      fallbackProviders: ["SCOREBOARD_BACKUP"],
    });

    await expect(
      runtime.execute("fixtures-live", (provider) => provider.fetchLivescores())
    ).rejects.toMatchObject({
      attempts: [
        expect.objectContaining({
          providerCode: "SPORTSMONKS",
          status: "failed",
          error: "SPORTSMONKS unavailable",
        }),
        expect.objectContaining({
          providerCode: "SCOREBOARD_BACKUP",
          status: "failed",
          error: "SCOREBOARD_BACKUP unavailable",
        }),
      ],
    });
  });
});
