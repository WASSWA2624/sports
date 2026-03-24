import { beforeEach, describe, expect, it, vi } from "vitest";

const getAssetDeliverySnapshot = vi.fn();
const getOperationalDashboardSnapshot = vi.fn();
const getReleaseInfo = vi.fn(() => ({
  version: "0.1.0-test",
  channel: "test",
  commitSha: "abc123",
  buildId: "BUILD_TEST",
}));
const getSportsSyncConfig = vi.fn(() => ({
  provider: "SPORTSMONKS",
  fallbackProviders: ["SCOREBOARD_BACKUP"],
}));
const getProviderChain = vi.fn(() => [
  {
    code: "SPORTSMONKS",
    role: "primary",
  },
]);

vi.mock("../../../../lib/assets-server", () => ({
  getAssetDeliverySnapshot,
}));

vi.mock("../../../../lib/operations", () => ({
  getOperationalDashboardSnapshot,
}));

vi.mock("../../../../lib/release", () => ({
  getReleaseInfo,
}));

vi.mock("../../../../lib/sports/config", () => ({
  getSportsSyncConfig,
}));

vi.mock("../../../../lib/sports/provider", () => ({
  getProviderChain,
}));

const { GET } = await import("../route.js");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the expected health contract when snapshots succeed", async () => {
    getOperationalDashboardSnapshot.mockResolvedValue({
      liveData: {
        liveFixtureCount: 4,
      },
      slos: [],
      cache: {
        hitRate: 0.82,
        byTag: [{ tag: "coreui:home" }],
      },
      search: {
        p95Ms: 120,
      },
    });
    getAssetDeliverySnapshot.mockResolvedValue({
      config: {
        cdnBaseUrl: "https://cdn.example.com",
      },
      coverage: {
        articles: { coverageRate: 100 },
        competitions: { coverageRate: 100 },
        teams: { coverageRate: 100 },
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      service: "sports",
      release: {
        version: "0.1.0-test",
        channel: "test",
      },
      providerChain: [{ code: "SPORTSMONKS", role: "primary" }],
      cache: {
        hitRate: 0.82,
        observedTags: 1,
      },
      assets: {
        cdnConfigured: true,
      },
    });
  });

  it("returns a degraded response when snapshot generation fails", async () => {
    getOperationalDashboardSnapshot.mockRejectedValue(new Error("DB unavailable"));
    getAssetDeliverySnapshot.mockResolvedValue({
      config: {
        cdnBaseUrl: "",
      },
      coverage: {
        articles: {},
        competitions: {},
        teams: {},
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      status: "degraded",
      service: "sports",
      release: {
        version: "0.1.0-test",
      },
      error: "DB unavailable",
    });
  });
});
