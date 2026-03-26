import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMatchdayFeed } from "../match-data";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("matchday feed date-time filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 26, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to today's full-day window", () => {
    const feed = getMatchdayFeed();
    const ids = feed.fixtures.map((fixture) => fixture.id);

    expect(feed.selectedPreset).toBe("today");
    expect(ids).toEqual(
      expect.arrayContaining([
        "epl-live-ars-che",
        "ucl-live-rma-bay",
        "ll-upcoming-bar-sev",
        "sa-upcoming-int-laz",
        "bl1-finished-bvb-rbl",
      ])
    );
    expect(ids).not.toEqual(
      expect.arrayContaining([
        "epl-finished-mci-liv",
        "epl-finished-tot-avl",
        "bl1-upcoming-lev-fra",
      ])
    );
  });

  it("resolves relative presets across past and future windows", () => {
    const lastWeekFeed = getMatchdayFeed({ preset: "last-week" });
    const nextMonthFeed = getMatchdayFeed({ preset: "next-month" });

    expect(lastWeekFeed.selectedPreset).toBe("last-week");
    expect(lastWeekFeed.fixtures.map((fixture) => fixture.id)).toContain("epl-finished-tot-avl");

    expect(nextMonthFeed.selectedPreset).toBe("next-month");
    expect(nextMonthFeed.fixtures.map((fixture) => fixture.id)).toContain("bl1-upcoming-lev-fra");
  });

  it("treats edited start and end boundaries as a custom date-time window", () => {
    const today = toDateKey(new Date());
    const feed = getMatchdayFeed({
      preset: "today",
      startDate: today,
      startTime: "20:30",
      endDate: today,
      endTime: "23:59",
    });
    const ids = feed.fixtures.map((fixture) => fixture.id);

    expect(feed.selectedPreset).toBe("custom");
    expect(feed.selectedStartTime).toBe("20:30");
    expect(feed.selectedEndTime).toBe("23:59");
    expect(ids).toEqual(
      expect.arrayContaining([
        "sa-upcoming-int-laz",
        "ucl-live-rma-bay",
        "ll-upcoming-bar-sev",
      ])
    );
    expect(ids).not.toEqual(
      expect.arrayContaining([
        "bl1-finished-bvb-rbl",
        "epl-live-ars-che",
      ])
    );
  });
});
