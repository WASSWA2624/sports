import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMatchdayFeed, getTeamDetail } from "../match-data";

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

  it("groups today's matches by kickoff time in chronological order", () => {
    const feed = getMatchdayFeed();

    expect(feed.competitionCount).toBe(5);
    expect(feed.groups.map((group) => group.fixtures[0].id)).toEqual([
      "bl1-finished-bvb-rbl",
      "epl-live-ars-che",
      "sa-upcoming-int-laz",
      "ucl-live-rma-bay",
      "ll-upcoming-bar-sev",
    ]);
    expect(feed.groups[0].leagueNames).toEqual(["Bundesliga"]);
  });

  it("supports league-name search while keeping time-grouped results", () => {
    const feed = getMatchdayFeed({ query: "premier league" });

    expect(feed.fixtures.map((fixture) => fixture.id)).toEqual(["epl-live-ars-che"]);
    expect(feed.groups).toHaveLength(1);
    expect(feed.groups[0].leagueNames).toEqual(["Premier League"]);
  });

  it("builds team detail snapshots from the shared fixture dataset", () => {
    const arsenal = getTeamDetail("arsenal");
    const dortmund = getTeamDetail("borussia-dortmund");

    expect(arsenal?.name).toBe("Arsenal");
    expect(arsenal?.activeFixtures.map((fixture) => fixture.id)).toContain("epl-live-ars-che");
    expect(arsenal?.playerPreview.map((player) => player.name)).toContain("David Raya");

    expect(dortmund?.recentResults.map((fixture) => fixture.id)).toContain("bl1-finished-bvb-rbl");
    expect(dortmund?.form[0]?.result).toBe("W");
  });
});
