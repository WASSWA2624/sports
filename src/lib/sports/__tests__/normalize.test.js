import { describe, expect, it } from "vitest";
import {
  normalizeSportsMonksBroadcastChannels,
  normalizeSportsMonksFixtures,
  normalizeSportsMonksOdds,
  normalizeSportsMonksStandings,
} from "../normalize";

describe("sports normalizers", () => {
  it("normalizes fixtures into provider-agnostic records", () => {
    const fixtures = normalizeSportsMonksFixtures([
      {
        id: 100,
        league: { id: 10, name: "Premier League", short_code: "EPL" },
        season: { id: 20, name: "2025/2026", starting_at: "2025-08-01", ending_at: "2026-05-20" },
        participants: [
          { id: 1, name: "Arsenal", short_name: "ARS", meta: { location: "home" } },
          { id: 2, name: "Chelsea", short_name: "CHE", meta: { location: "away" } },
        ],
        state: { short_name: "LIVE", name: "In Play" },
        scores: [
          { score: { participant: "home", goals: 2 } },
          { score: { participant: "away", goals: 1 } },
        ],
        events: [
          {
            id: 900,
            minute: 34,
            participant_id: 1,
            player_id: 77,
            player_name: "Bukayo Saka",
            type: { name: "Goal", developer_name: "GOAL" },
            info: "Right-foot finish",
          },
        ],
        statistics: [
          {
            participant_id: 1,
            location: "home",
            data: { value: 7 },
            type: { name: "Shots On Target", code: "shots_on_target" },
          },
        ],
        lineups: [
          {
            id: 3001,
            team_id: 1,
            player_id: 77,
            player_name: "Bukayo Saka",
            jersey_number: 7,
            formation_field: "3:3",
            type_id: 11,
          },
        ],
        starting_at: "2026-03-23T18:00:00Z",
      },
    ]);

    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toMatchObject({
      externalRef: "100",
      status: "LIVE",
      homeTeam: { name: "Arsenal" },
      awayTeam: { name: "Chelsea" },
      resultSnapshot: { homeScore: 2, awayScore: 1 },
      incidents: [
        expect.objectContaining({
          minute: 34,
          side: "HOME",
          teamExternalRef: "1",
          player: expect.objectContaining({
            externalRef: "77",
            name: "Bukayo Saka",
          }),
        }),
      ],
      lineups: [
        expect.objectContaining({
          side: "HOME",
          teamExternalRef: "1",
          player: expect.objectContaining({
            externalRef: "77",
          }),
        }),
      ],
      statistics: [
        expect.objectContaining({
          side: "HOME",
          metricKey: "shots_on_target",
          value: "7",
        }),
      ],
      detailPayloads: {
        incidents: true,
        lineups: true,
        statistics: true,
      },
    });
  });

  it("normalizes standings rows", () => {
    const standings = normalizeSportsMonksStandings(
      [
        {
          participant: { id: 1, name: "Arsenal" },
          position: 1,
          details: {
            matches_played: 30,
            won: 21,
            draw: 5,
            lost: 4,
            goals_scored: 65,
            goals_against: 28,
            points: 68,
          },
        },
      ],
      "20"
    );

    expect(standings[0]).toMatchObject({
      seasonExternalRef: "20",
      position: 1,
      team: { externalRef: "1" },
      points: 68,
    });
  });

  it("normalizes odds markets and selections", () => {
    const markets = normalizeSportsMonksOdds(
      [
        {
          id: 300,
          bookmaker: { name: "Bookmaker A" },
          market: { name: "1X2" },
          values: [
            { id: 301, label: "Home", odds: 1.85 },
            { id: 302, label: "Draw", odds: 3.4, stopped: true },
          ],
        },
      ],
      "100"
    );

    expect(markets[0]).toMatchObject({
      fixtureExternalRef: "100",
      bookmaker: "Bookmaker A",
      marketType: "1X2",
    });
    expect(markets[0].selections[1]).toMatchObject({
      externalRef: "302",
      isActive: false,
    });
  });

  it("normalizes broadcast channels", () => {
    const channels = normalizeSportsMonksBroadcastChannels(
      [
        {
          id: 42,
          name: "Play Sports",
          url: "https://www.playsports.example",
          type: "tv",
          countries: [{ code: "BE", name: "Belgium" }],
        },
      ],
      "100"
    );

    expect(channels[0]).toMatchObject({
      fixtureExternalRef: "100",
      name: "Play Sports",
      territory: "BE",
      channelType: "tv",
    });
  });
});
