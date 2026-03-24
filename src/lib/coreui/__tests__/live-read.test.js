import { describe, expect, it } from "vitest";
import {
  buildFixtureRefereeSummary,
  buildFixtureVenueSummary,
  buildHeadToHeadSummary,
} from "../live-read";

describe("live read helpers", () => {
  it("summarizes head-to-head results in the current matchup orientation", () => {
    const summary = buildHeadToHeadSummary(
      [
        {
          id: "fixture-a",
          status: "FINISHED",
          startsAt: "2026-03-01T18:00:00.000Z",
          homeTeamId: "ars",
          awayTeamId: "che",
          resultSnapshot: { homeScore: 2, awayScore: 1 },
        },
        {
          id: "fixture-b",
          status: "FINISHED",
          startsAt: "2026-02-01T18:00:00.000Z",
          homeTeamId: "che",
          awayTeamId: "ars",
          resultSnapshot: { homeScore: 0, awayScore: 0 },
        },
        {
          id: "fixture-c",
          status: "SCHEDULED",
          startsAt: "2026-04-01T18:00:00.000Z",
          homeTeamId: "ars",
          awayTeamId: "che",
          resultSnapshot: null,
        },
      ],
      {
        homeTeamId: "ars",
        awayTeamId: "che",
        snapshots: [{ capturedAt: "2026-03-02T10:00:00.000Z" }],
      }
    );

    expect(summary).toMatchObject({
      totalCompleted: 2,
      homeWins: 1,
      awayWins: 0,
      draws: 1,
      latestSnapshotAt: "2026-03-02T10:00:00.000Z",
    });
    expect(summary.completedMatches[0].id).toBe("fixture-a");
    expect(summary.upcomingMatches[0].id).toBe("fixture-c");
  });

  it("prefers the main referee when multiple officials are present", () => {
    const referee = buildFixtureRefereeSummary([
      {
        role: "assistant_referee",
        official: { name: "A. Assistant", countryName: "England" },
      },
      {
        role: "referee",
        official: { name: "M. Oliver", countryName: "England" },
      },
    ]);

    expect(referee).toEqual({
      name: "M. Oliver",
      role: "referee",
      countryName: "England",
    });
  });

  it("builds venue context from the normalized venue relation", () => {
    const venue = buildFixtureVenueSummary({
      venue: "Emirates Stadium",
      league: {
        countryRecord: { name: "England" },
      },
      venueRecord: {
        name: "Emirates Stadium",
        city: "London",
        countryName: "England",
        capacity: 60260,
      },
    });

    expect(venue).toEqual({
      name: "Emirates Stadium",
      city: "London",
      countryName: "England",
      capacity: 60260,
    });
  });
});
