import { describe, expect, it } from "vitest";
import {
  buildBestOddsCards,
  buildGroupStandingsPreview,
  buildHighOddsCards,
  buildLiveBoardFixtureSignals,
  buildPredictionCards,
} from "../live-board";

describe("live board helpers", () => {
  it("derives row state for live and frozen fixtures", () => {
    const liveFixture = {
      id: "fixture-live",
      status: "LIVE",
      startsAt: "2026-03-24T12:00:00.000Z",
      lastSyncedAt: null,
      homeTeam: { id: "home", name: "Arsenal" },
      awayTeam: { id: "away", name: "Chelsea" },
      resultSnapshot: {
        homeScore: 2,
        awayScore: 1,
        statusText: "In Play",
      },
      metadata: {
        state: {
          minute: 63,
        },
        events: [
          {
            id: "goal-1",
            minute: 15,
            type: { developer_name: "GOAL", name: "Goal" },
          },
          {
            id: "yellow-1",
            minute: 44,
            type: { developer_name: "YELLOW_CARD", name: "Yellow card" },
          },
        ],
      },
    };
    const finishedFixture = {
      ...liveFixture,
      id: "fixture-finished",
      status: "FINISHED",
      lastSyncedAt: "2026-03-24T12:40:00.000Z",
      resultSnapshot: {
        homeScore: 2,
        awayScore: 1,
        statusText: "Full Time",
        capturedAt: "2020-03-24T14:00:00.000Z",
      },
      metadata: {
        state: {
          minute: 90,
        },
      },
    };

    const liveSignals = buildLiveBoardFixtureSignals(liveFixture);
    const finishedSignals = buildLiveBoardFixtureSignals(finishedFixture);

    expect(liveSignals.statusLabel).toBe("63'");
    expect(liveSignals.stale).toBe(true);
    expect(liveSignals.incidentCounts).toMatchObject({
      goals: 1,
      yellowCards: 1,
      redCards: 0,
    });
    expect(finishedSignals.isFrozen).toBe(true);
    expect(finishedSignals.freezeLabel).toContain("Snapshot frozen");
  });

  it("builds a live table preview with position movement", () => {
    const teams = [
      { id: "ars", name: "Arsenal", shortName: "ARS" },
      { id: "che", name: "Chelsea", shortName: "CHE" },
    ];
    const standings = [
      {
        id: "standing-che",
        seasonId: "season-1",
        team: teams[1],
        position: 1,
        played: 29,
        won: 20,
        drawn: 3,
        lost: 6,
        goalsFor: 50,
        goalsAgainst: 25,
        points: 63,
      },
      {
        id: "standing-ars",
        seasonId: "season-1",
        team: teams[0],
        position: 2,
        played: 29,
        won: 20,
        drawn: 2,
        lost: 7,
        goalsFor: 52,
        goalsAgainst: 26,
        points: 62,
      },
    ];
    const fixtures = [
      {
        id: "fixture-live",
        status: "LIVE",
        startsAt: "2026-03-24T12:00:00.000Z",
        homeTeam: teams[0],
        awayTeam: teams[1],
        resultSnapshot: {
          homeScore: 1,
          awayScore: 0,
        },
      },
    ];

    const preview = buildGroupStandingsPreview({
      fixtures,
      standings,
      teams,
    });

    expect(preview.available).toBe(true);
    expect(preview.selectedView).toBe("live");
    expect(preview.rows[0]).toMatchObject({
      team: { id: "ars" },
      position: 1,
      movement: 1,
      isHighlighted: true,
    });
    expect(preview.rows[1]).toMatchObject({
      team: { id: "che" },
      position: 2,
      movement: -1,
      isHighlighted: true,
    });
  });

  it("builds best-odds and prediction cards for board widgets", () => {
    const fixtures = [
      {
        id: "fixture-1",
        externalRef: "fixture-1",
        league: { name: "Premier League" },
        homeTeam: { name: "Arsenal" },
        awayTeam: { name: "Chelsea" },
        oddsMarkets: [
          {
            bookmakerId: "bookmaker-1",
            bookmaker: "PulseBet",
            marketType: "1X2",
            selections: [
              { label: "Arsenal", priceDecimal: 2.4, isActive: true },
              { label: "Draw", priceDecimal: 3.8, isActive: true },
            ],
          },
        ],
      },
      {
        id: "fixture-2",
        externalRef: "fixture-2",
        league: { name: "Serie A" },
        homeTeam: { name: "Inter" },
        awayTeam: { name: "Roma" },
        oddsMarkets: [
          {
            bookmakerId: "bookmaker-2",
            bookmaker: "NorthLine",
            marketType: "1X2",
            selections: [
              { label: "Roma", priceDecimal: 4.1, isActive: true },
            ],
          },
        ],
      },
    ];
    const predictions = [
      {
        id: "prediction-1",
        key: "prediction:1",
        title: "Back Arsenal to win",
        summary: "Home control and stronger pressing profile.",
        selectionLabel: "Arsenal",
        priceDecimal: 2.4,
        confidence: 82,
        edgeScore: 7.5,
        fixture: {
          id: "fixture-1",
          externalRef: "fixture-1",
          homeTeam: { name: "Arsenal" },
          awayTeam: { name: "Chelsea" },
        },
        bookmaker: {
          id: "bookmaker-1",
          name: "PulseBet",
        },
      },
    ];

    const oddsCards = buildBestOddsCards(fixtures);
    const highOddsCards = buildHighOddsCards(fixtures);
    const predictionCards = buildPredictionCards(predictions);

    expect(oddsCards[0]).toMatchObject({
      fixtureId: "fixture-2",
      bookmaker: "NorthLine",
      selectionLabel: "Roma",
      priceLabel: "4.10",
    });
    expect(highOddsCards).toHaveLength(2);
    expect(highOddsCards[0]).toMatchObject({
      fixtureId: "fixture-2",
      priceLabel: "4.10",
    });
    expect(predictionCards[0]).toMatchObject({
      title: "Back Arsenal to win",
      fixtureRef: "fixture-1",
      bookmaker: "PulseBet",
      confidenceLabel: "82%",
      priceLabel: "2.40",
    });
  });
});
