import { describe, expect, it } from "vitest";
import {
  buildCompetitionOddsModule,
  buildFixtureBroadcastModule,
  buildFixtureOddsModule,
} from "../odds-broadcast";

function buildFixture(overrides = {}) {
  return {
    id: "fixture-1",
    externalRef: "fixture-1",
    startsAt: "2026-03-24T18:00:00.000Z",
    lastSyncedAt: "2026-03-24T17:10:00.000Z",
    homeTeam: { name: "Arsenal" },
    awayTeam: { name: "Chelsea" },
    oddsMarkets: [
      {
        id: "market-1",
        bookmaker: "PulseBook",
        marketType: "1X2",
        suspended: false,
        lastSyncedAt: "2026-03-24T17:10:00.000Z",
        selections: [
          { id: "sel-1", label: "Home", priceDecimal: 1.84, isActive: true },
          { id: "sel-2", label: "Draw", priceDecimal: 3.55, isActive: true },
        ],
      },
    ],
    broadcastChannels: [
      {
        id: "channel-1",
        name: "NBC Sports",
        territory: "US",
        channelType: "tv",
        url: "https://example.com/nbc",
        isActive: true,
      },
    ],
    ...overrides,
  };
}

describe("odds and broadcast read models", () => {
  it("marks odds stale when the latest sync timestamp ages out", () => {
    const fixture = buildFixture({
      oddsMarkets: [
        {
          id: "market-1",
          bookmaker: "PulseBook",
          marketType: "1X2",
          suspended: false,
          lastSyncedAt: "2000-01-01T12:00:00.000Z",
          selections: [{ id: "sel-1", label: "Home", priceDecimal: 1.84, isActive: true }],
        },
      ],
    });

    const odds = buildFixtureOddsModule(fixture, {
      locale: "en",
      viewerTerritory: "US",
      enabled: true,
    });

    expect(odds.state).toBe("stale");
    expect(odds.groups[0]).toMatchObject({
      label: "1X2",
      sources: ["PulseBook"],
    });
  });

  it("marks odds as region restricted when no market is viewable in the current territory", () => {
    const fixture = buildFixture({
      oddsMarkets: [
        {
          id: "market-1",
          bookmaker: "NorthLine",
          marketType: "1X2",
          suspended: false,
          lastSyncedAt: "2026-03-24T17:10:00.000Z",
          metadata: {
            allowedTerritories: ["GB"],
          },
          selections: [{ id: "sel-1", label: "Home", priceDecimal: 1.72, isActive: true }],
        },
      ],
    });

    const odds = buildFixtureOddsModule(fixture, {
      locale: "en",
      viewerTerritory: "US",
      enabled: true,
    });

    expect(odds.state).toBe("region_restricted");
    expect(odds.groups).toHaveLength(0);
  });

  it("builds competition odds tabs from viewable fixture markets", () => {
    const league = {
      fixtures: [
        buildFixture(),
        buildFixture({
          id: "fixture-2",
          externalRef: "fixture-2",
          homeTeam: { name: "Manchester City" },
          awayTeam: { name: "Liverpool" },
          oddsMarkets: [
            {
              id: "market-2",
              bookmaker: "NorthLine",
              marketType: "1X2",
              suspended: false,
              lastSyncedAt: "2000-01-01T17:30:00.000Z",
              selections: [{ id: "sel-3", label: "Home", priceDecimal: 1.72, isActive: true }],
            },
          ],
        }),
      ],
    };

    const competitionOdds = buildCompetitionOddsModule(league, {
      locale: "en",
      viewerTerritory: "US",
      enabled: true,
    });

    expect(competitionOdds.state).toBe("available");
    expect(competitionOdds.tabs).toHaveLength(1);
    expect(competitionOdds.tabs[0].rows).toHaveLength(2);
  });

  it("returns broadcast listings for the viewer territory", () => {
    const broadcast = buildFixtureBroadcastModule(buildFixture(), {
      locale: "en",
      viewerTerritory: "US",
      enabled: true,
    });

    expect(broadcast.state).toBe("available");
    expect(broadcast.channels[0]).toMatchObject({
      name: "NBC Sports",
      channelType: "tv",
    });
  });

  it("marks broadcast listings as region restricted when only other territories are available", () => {
    const broadcast = buildFixtureBroadcastModule(
      buildFixture({
        broadcastChannels: [
          {
            id: "channel-2",
            name: "Sky Sports Main Event",
            territory: "GB",
            channelType: "tv",
            isActive: true,
          },
        ],
      }),
      {
        locale: "en",
        viewerTerritory: "US",
        enabled: true,
      }
    );

    expect(broadcast.state).toBe("region_restricted");
    expect(broadcast.channels).toHaveLength(0);
    expect(broadcast.restrictedTerritories).toContain("GB");
  });
});
