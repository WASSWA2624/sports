import { describe, expect, it } from "vitest";
import {
  buildFixtureDetailModules,
  buildFixtureRefreshProfile,
  getFixtureMinute,
} from "../live-detail";

function buildFixture(overrides = {}) {
  return {
    id: "fixture-1",
    status: "FINISHED",
    startsAt: "2026-03-23T17:00:00.000Z",
    stateReason: null,
    homeTeam: { id: "home-id", externalRef: "53", name: "Arsenal" },
    awayTeam: { id: "away-id", externalRef: "62", name: "Chelsea" },
    resultSnapshot: {
      homeScore: 2,
      awayScore: 1,
      statusText: "Full Time",
      capturedAt: "2026-03-23T19:05:00.000Z",
    },
    metadata: {
      participants: [
        { id: 53, meta: { location: "home" } },
        { id: 62, meta: { location: "away" } },
      ],
      state: {
        name: "Full Time",
        minute: 90,
      },
      events: [
        {
          id: 1,
          minute: 12,
          participant_id: 53,
          player_name: "Bukayo Saka",
          type: { name: "Goal", developer_name: "GOAL" },
          info: "Left-foot finish",
        },
        {
          id: 2,
          minute: 68,
          participant_id: 62,
          player_name: "Nicolas Jackson",
          type: { name: "Goal", developer_name: "GOAL" },
          info: "Tap-in finish",
        },
      ],
      statistics: [
        {
          participant_id: 53,
          location: "home",
          data: { value: 7 },
          type: { name: "Shots On Target", stat_group: "offensive" },
        },
        {
          participant_id: 62,
          location: "away",
          data: { value: 4 },
          type: { name: "Shots On Target", stat_group: "offensive" },
        },
      ],
      lineups: [
        {
          id: 10,
          team_id: 53,
          player_name: "David Raya",
          jersey_number: 22,
          formation_field: "1:1",
          type_id: 11,
        },
        {
          id: 11,
          team_id: 53,
          player_name: "Leandro Trossard",
          jersey_number: 19,
          type_id: 12,
        },
        {
          id: 12,
          team_id: 62,
          player_name: "Robert Sanchez",
          jersey_number: 1,
          formation_field: "1:1",
          type_id: 11,
        },
      ],
      formations: [
        { team_id: 53, formation: "4-3-3" },
        { team_id: 62, formation: "4-2-3-1" },
      ],
    },
    ...overrides,
  };
}

describe("live detail helpers", () => {
  it("builds fixture modules from stored provider metadata", () => {
    const fixture = buildFixture();
    const detail = buildFixtureDetailModules(fixture);

    expect(detail.timeline).toHaveLength(2);
    expect(detail.keyEvents).toHaveLength(2);
    expect(detail.statistics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Shots on target",
          home: "7",
          away: "4",
        }),
      ])
    );
    expect(detail.lineups.home.formation).toBe("4-3-3");
    expect(detail.lineups.home.starters[0]).toEqual(
      expect.objectContaining({ name: "David Raya" })
    );
    expect(detail.lineups.home.bench[0]).toEqual(
      expect.objectContaining({ name: "Leandro Trossard" })
    );
    expect(detail.resultFreeze.isFrozen).toBe(true);
  });

  it("derives a live minute and active refresh profile for in-play fixtures", () => {
    const fixture = buildFixture({
      status: "LIVE",
      resultSnapshot: {
        homeScore: 1,
        awayScore: 0,
        statusText: "In Play",
        capturedAt: "2026-03-23T18:10:00.000Z",
      },
      metadata: {
        participants: [
          { id: 53, meta: { location: "home" } },
          { id: 62, meta: { location: "away" } },
        ],
        state: {
          name: "In Play",
          minute: 63,
          extra_minute: 1,
        },
      },
    });

    expect(getFixtureMinute(fixture)).toBe("63+1'");
    expect(buildFixtureRefreshProfile(fixture)).toEqual(
      expect.objectContaining({
        enabled: true,
        intervalMs: 20000,
      })
    );
  });

  it("prefers persisted match-center relations when they are already normalized", () => {
    const fixture = buildFixture({
      metadata: {
        state: {
          name: "In Play",
          minute: 63,
        },
      },
      incidents: [
        {
          id: "incident-1",
          minute: 63,
          extraMinute: 1,
          side: "HOME",
          incidentKey: "GOAL",
          type: "GOAL",
          title: "Goal",
          description: "Close-range finish",
          player: { id: "player-1", name: "Bukayo Saka" },
          secondaryPlayer: { id: "player-2", name: "Martin Odegaard" },
        },
      ],
      statistics: [
        {
          id: "stat-1",
          side: "HOME",
          metricKey: "shots_on_target",
          name: "Shots on target",
          value: "7",
        },
        {
          id: "stat-2",
          side: "AWAY",
          metricKey: "shots_on_target",
          name: "Shots on target",
          value: "4",
        },
      ],
      lineups: [
        {
          id: "lineup-1",
          side: "HOME",
          jerseyNumber: "7",
          formationSlot: "3-3",
          isStarter: true,
          player: { id: "player-1", name: "Bukayo Saka" },
        },
        {
          id: "lineup-2",
          side: "AWAY",
          jerseyNumber: "15",
          isStarter: false,
          player: { id: "player-3", name: "Nicolas Jackson" },
        },
      ],
    });

    const detail = buildFixtureDetailModules(fixture);

    expect(detail.timeline[0]).toEqual(
      expect.objectContaining({
        actor: "Bukayo Saka",
        secondaryActor: "Martin Odegaard",
        minuteLabel: "63+1'",
      })
    );
    expect(detail.statistics[0]).toEqual(
      expect.objectContaining({
        label: "Shots on target",
        home: "7",
        away: "4",
      })
    );
    expect(detail.lineups.home.starters[0]).toEqual(
      expect.objectContaining({
        name: "Bukayo Saka",
      })
    );
    expect(detail.lineups.away.bench[0]).toEqual(
      expect.objectContaining({
        name: "Nicolas Jackson",
      })
    );
  });
});
