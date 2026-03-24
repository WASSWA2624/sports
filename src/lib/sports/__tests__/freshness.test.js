import { beforeEach, describe, expect, it, vi } from "vitest";

const getSportsSyncConfig = vi.fn(() => ({
  provider: "SPORTSMONKS",
  stableRefreshMinutes: 360,
  volatileRefreshSeconds: 45,
  catalogRefreshMinutes: 15,
}));

const runSyncJob = vi.fn(async () => ({
  jobId: "job-1",
}));

const getCheckpoint = vi.fn(async () => null);

vi.mock("../config", () => ({
  getSportsSyncConfig,
}));

vi.mock("../../sync/jobs", () => ({
  runSyncJob,
}));

vi.mock("../../sync/service", () => ({
  getCheckpoint,
}));

async function loadFreshnessModule() {
  vi.resetModules();
  return import("../freshness.js");
}

describe("sports freshness guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete globalThis.__sportsSyncRefreshRegistry;
    getSportsSyncConfig.mockReturnValue({
      provider: "SPORTSMONKS",
      stableRefreshMinutes: 360,
      volatileRefreshSeconds: 45,
      catalogRefreshMinutes: 15,
    });
  });

  it("does not trigger the stable sync job when checkpoints are fresh", async () => {
    getCheckpoint.mockResolvedValue({
      lastSuccessAt: new Date(),
    });

    const { ensureStableSportsDataFresh } = await loadFreshnessModule();
    const result = await ensureStableSportsDataFresh();

    expect(runSyncJob).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "fresh",
      triggered: false,
      staleKeys: [],
    });
  });

  it("waits for a cold-start stable refresh when no successful snapshot exists yet", async () => {
    getCheckpoint.mockResolvedValue(null);

    const { ensureStableSportsDataFresh } = await loadFreshnessModule();
    const result = await ensureStableSportsDataFresh();

    expect(runSyncJob).toHaveBeenCalledWith("static-ish");
    expect(result).toMatchObject({
      status: "success",
      triggered: true,
      waited: true,
      staleKeys: ["taxonomy:snapshot", "fixtures:window", "season:tracked"],
    });
  });

  it("starts a background refresh for stale catalog data without blocking the caller", async () => {
    getCheckpoint.mockResolvedValue({
      lastSuccessAt: new Date(Date.now() - 30 * 60 * 1000),
    });

    const { ensureCatalogSportsDataFresh } = await loadFreshnessModule();
    const result = await ensureCatalogSportsDataFresh();

    expect(runSyncJob).toHaveBeenCalledWith("catalog");
    expect(result).toMatchObject({
      status: "refreshing",
      triggered: true,
      waited: false,
      staleKeys: ["bookmakers:catalog"],
    });
  });

  it("deduplicates concurrent volatile refreshes behind one running job", async () => {
    getCheckpoint.mockResolvedValue({
      lastSuccessAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    let resolveJob;
    runSyncJob.mockReturnValue(
      new Promise((resolve) => {
        resolveJob = resolve;
      })
    );

    const { ensureVolatileSportsDataFresh } = await loadFreshnessModule();
    const first = ensureVolatileSportsDataFresh({ waitForCompletion: true });
    const second = ensureVolatileSportsDataFresh({ waitForCompletion: true });

    await vi.waitFor(() => {
      expect(runSyncJob).toHaveBeenCalledTimes(1);
    });

    resolveJob({
      jobId: "job-2",
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toMatchObject({
      status: "success",
      triggered: true,
      waited: true,
    });
    expect(secondResult).toMatchObject({
      status: "success",
      triggered: true,
      waited: true,
    });
  });
});
