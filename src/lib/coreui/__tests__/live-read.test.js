import { describe, expect, it } from "vitest";
import {
  buildBoardGroups,
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

  it("serializes grouped live-board fixtures before they reach client components", () => {
    const groups = buildBoardGroups(
      [
        {
          id: "fixture-live",
          leagueId: "league-prem",
          seasonId: "season-2026",
          competitionId: "comp-prem",
          homeTeamId: "ars",
          awayTeamId: "che",
          externalRef: "fixture-ext-1",
          startsAt: "2026-03-24T18:00:00.000Z",
          status: "LIVE",
          venue: "Emirates Stadium",
          round: "Matchday 30",
          lastSyncedAt: "2026-03-24T18:08:00.000Z",
          league: {
            id: "league-prem",
            code: "EPL",
            name: "Premier League",
            country: "England",
          },
          homeTeam: {
            id: "ars",
            name: "Arsenal",
            shortName: "ARS",
          },
          awayTeam: {
            id: "che",
            name: "Chelsea",
            shortName: "CHE",
          },
          resultSnapshot: {
            homeScore: 2,
            awayScore: 1,
            statusText: "82'",
            capturedAt: "2026-03-24T18:08:10.000Z",
          },
          oddsMarkets: [
            {
              id: "market-1",
              selections: [
                {
                  id: "selection-1",
                  line: { value: "1.5" },
                  priceDecimal: { value: "1.84" },
                },
              ],
            },
          ],
        },
      ],
      new Map(),
      "en"
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].fixtures[0]).toEqual({
      id: "fixture-live",
      externalRef: "fixture-ext-1",
      homeTeamId: "ars",
      awayTeamId: "che",
      startsAt: "2026-03-24T18:00:00.000Z",
      status: "LIVE",
      venue: "Emirates Stadium",
      round: "Matchday 30",
      stateReason: null,
      lastSyncedAt: "2026-03-24T18:08:00.000Z",
      league: {
        id: "league-prem",
        code: "EPL",
        name: "Premier League",
      },
      homeTeam: {
        id: "ars",
        name: "Arsenal",
        shortName: "ARS",
      },
      awayTeam: {
        id: "che",
        name: "Chelsea",
        shortName: "CHE",
      },
      resultSnapshot: {
        homeScore: 2,
        awayScore: 1,
        statusText: "82'",
        capturedAt: "2026-03-24T18:08:10.000Z",
      },
      boardSignals: {
        minuteLabel: null,
        statusLabel: "Live",
        refresh: expect.objectContaining({
          enabled: true,
          intervalMs: 20000,
        }),
        stale: false,
        staleLabel: null,
        incidentCounts: {
          goals: 0,
          yellowCards: 0,
          redCards: 0,
          varChecks: 0,
        },
        incidentIndicators: [],
        teamCards: {
          home: { yellow: 0, red: 0 },
          away: { yellow: 0, red: 0 },
        },
        keyMomentLabel: null,
        isTerminal: false,
        isFrozen: false,
        isSettling: false,
        freezeLabel: expect.stringContaining("Snapshot frozen"),
      },
    });
    expect(groups[0].fixtures[0]).not.toHaveProperty("oddsMarkets");
  });
});
