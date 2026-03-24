import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveWindowBackpressurePlan } from "../backpressure";

function buildFixture({
  externalRef,
  status = "SCHEDULED",
  startsAt = "2026-03-24T18:00:00.000Z",
  lastSyncedAt = "2026-03-24T17:58:00.000Z",
}) {
  return {
    id: externalRef,
    externalRef,
    status,
    startsAt,
    lastSyncedAt,
  };
}

describe("buildLiveWindowBackpressurePlan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps nominal budgets when live pressure is low", () => {
    vi.setSystemTime(new Date("2026-03-24T18:00:00.000Z"));

    const plan = buildLiveWindowBackpressurePlan(
      [
        buildFixture({ externalRef: "fixture-1", status: "LIVE" }),
        buildFixture({ externalRef: "fixture-2", status: "SCHEDULED" }),
      ],
      {
        maxActiveFixtureDetails: 12,
        maxOddsFixturesPerRun: 10,
        maxBroadcastFixturesPerRun: 8,
        liveBackpressureThreshold: 6,
        staleLiveGraceMinutes: 8,
      }
    );

    expect(plan.underPressure).toBe(false);
    expect(plan.mode).toBe("nominal");
    expect(plan.summary.detailBudget).toBe(12);
    expect(plan.summary.oddsBudget).toBe(10);
    expect(plan.summary.broadcastBudget).toBe(8);
  });

  it("throttles budgets when stale live fixtures are present", () => {
    vi.setSystemTime(new Date("2026-03-24T18:00:00.000Z"));

    const plan = buildLiveWindowBackpressurePlan(
      [
        buildFixture({
          externalRef: "fixture-live-stale",
          status: "LIVE",
          startsAt: "2026-03-24T17:00:00.000Z",
          lastSyncedAt: "2026-03-24T17:45:00.000Z",
        }),
        buildFixture({
          externalRef: "fixture-live-fresh",
          status: "LIVE",
          startsAt: "2026-03-24T17:30:00.000Z",
          lastSyncedAt: "2026-03-24T17:59:00.000Z",
        }),
        buildFixture({
          externalRef: "fixture-upcoming",
          status: "SCHEDULED",
          startsAt: "2026-03-24T18:20:00.000Z",
          lastSyncedAt: "2026-03-24T17:59:00.000Z",
        }),
      ],
      {
        maxActiveFixtureDetails: 20,
        maxOddsFixturesPerRun: 18,
        maxBroadcastFixturesPerRun: 12,
        liveBackpressureThreshold: 4,
        staleLiveGraceMinutes: 8,
      }
    );

    expect(plan.underPressure).toBe(true);
    expect(plan.mode).toBe("throttled-live-window");
    expect(plan.summary.staleLiveFixtures).toBe(1);
    expect(plan.summary.detailBudget).toBe(12);
    expect(plan.summary.oddsBudget).toBe(9);
    expect(plan.summary.broadcastBudget).toBe(6);
    expect(plan.detailFixtures[0].externalRef).toBe("fixture-live-stale");
  });
});
