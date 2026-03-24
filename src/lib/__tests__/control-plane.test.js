import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../cache", () => ({
  COREUI_CACHE_TAGS: [],
  FEATURE_CACHE_TAGS: [],
  KNOWN_CACHE_TAGS: ["coreui:home", "coreui:shell"],
  revalidateTagsWithAudit: vi.fn(),
}));

vi.mock("../assets-server", () => ({
  getAssetDeliverySnapshot: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {},
}));

vi.mock("../audit", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("../operations", () => ({
  getOperationalDashboardSnapshot: vi.fn(),
}));

vi.mock("../sports/config", () => ({
  getSportsSyncConfig: vi.fn(() => ({
    provider: "SPORTSMONKS",
    fallbackProviders: [],
  })),
}));

vi.mock("../sports/provider", () => ({
  getProviderChain: vi.fn(() => []),
  getRegisteredSportsProviders: vi.fn(() => []),
}));

const {
  buildPublicModuleMap,
  EMPTY_CONTROL_PLANE_WORKSPACE,
  PUBLIC_MODULE_DEFAULTS,
} = await import("../control-plane.js");

describe("control-plane release defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves public shell modules by default", () => {
    expect(buildPublicModuleMap()).toMatchObject(PUBLIC_MODULE_DEFAULTS);
  });

  it("turns ad and consent modules off when disabled or emergency-stopped", () => {
    const moduleMap = buildPublicModuleMap([
      {
        key: "shell_right_rail_ad_slot",
        isEnabled: true,
        emergencyDisabled: true,
      },
      {
        key: "shell_right_rail_consent",
        isEnabled: false,
        emergencyDisabled: false,
      },
    ]);

    expect(moduleMap.shell_right_rail_ad_slot).toBe(false);
    expect(moduleMap.shell_right_rail_consent).toBe(false);
    expect(moduleMap.shell_right_rail_support).toBe(true);
  });

  it("exposes a safe empty workspace for degraded admin reads", () => {
    expect(EMPTY_CONTROL_PLANE_WORKSPACE.summary).toEqual({
      adminUsers: 0,
      activeProviders: 0,
      openIssues: 0,
      cacheAttentionCount: 0,
      drillRunsLast24Hours: 0,
      routeErrorsLastHour: 0,
    });
    expect(EMPTY_CONTROL_PLANE_WORKSPACE.degraded).toBe(true);
  });
});
