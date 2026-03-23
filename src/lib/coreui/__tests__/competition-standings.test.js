import { describe, expect, it } from "vitest";
import { buildStandingTable } from "../competition-standings";

const teams = [
  { id: "ars", name: "Arsenal", shortName: "ARS" },
  { id: "che", name: "Chelsea", shortName: "CHE" },
  { id: "liv", name: "Liverpool", shortName: "LIV" },
];

const standings = [
  {
    id: "standing-ars",
    team: teams[0],
    position: 1,
    played: 29,
    won: 21,
    drawn: 5,
    lost: 3,
    goalsFor: 64,
    goalsAgainst: 27,
    points: 68,
  },
  {
    id: "standing-che",
    team: teams[1],
    position: 2,
    played: 29,
    won: 18,
    drawn: 8,
    lost: 3,
    goalsFor: 58,
    goalsAgainst: 30,
    points: 62,
  },
  {
    id: "standing-liv",
    team: teams[2],
    position: 3,
    played: 29,
    won: 17,
    drawn: 6,
    lost: 6,
    goalsFor: 53,
    goalsAgainst: 31,
    points: 57,
  },
];

const fixtures = [
  {
    id: "fixture-finished",
    status: "FINISHED",
    startsAt: "2026-03-20T12:00:00.000Z",
    homeTeam: teams[1],
    awayTeam: teams[0],
    resultSnapshot: {
      homeScore: 1,
      awayScore: 3,
    },
  },
  {
    id: "fixture-live",
    status: "LIVE",
    startsAt: "2026-03-24T12:00:00.000Z",
    homeTeam: teams[0],
    awayTeam: teams[1],
    resultSnapshot: {
      homeScore: 2,
      awayScore: 1,
    },
  },
  {
    id: "fixture-scheduled",
    status: "SCHEDULED",
    startsAt: "2026-03-28T12:00:00.000Z",
    homeTeam: teams[2],
    awayTeam: teams[0],
    resultSnapshot: {
      homeScore: 0,
      awayScore: 0,
    },
  },
];

describe("buildStandingTable", () => {
  it("keeps the overall view available when stored standings exist", () => {
    const table = buildStandingTable({
      teams,
      standings,
      fixtures,
      view: "overall",
    });

    expect(table.availableViews).toEqual(["overall", "home", "away", "form", "live"]);
    expect(table.rows[0]).toMatchObject({
      team: { id: "ars" },
      points: 68,
      played: 29,
    });
  });

  it("derives home rows from completed fixtures only", () => {
    const table = buildStandingTable({
      teams,
      standings,
      fixtures,
      view: "home",
    });

    expect(table.selectedView).toBe("home");
    expect(table.rows.find((row) => row.team.id === "che")).toMatchObject({
      played: 1,
      lost: 1,
      goalsFor: 1,
      goalsAgainst: 3,
      points: 0,
    });
    expect(table.rows.find((row) => row.team.id === "ars")).toBeUndefined();
  });

  it("builds form rows from each team's last completed matches", () => {
    const table = buildStandingTable({
      teams,
      standings,
      fixtures,
      view: "form",
    });

    expect(table.rows.find((row) => row.team.id === "ars")).toMatchObject({
      played: 1,
      won: 1,
      points: 3,
      form: ["W"],
    });
  });

  it("applies live snapshots on top of stored standings for the live view", () => {
    const table = buildStandingTable({
      teams,
      standings,
      fixtures,
      view: "live",
    });

    expect(table.selectedView).toBe("live");
    expect(table.rows[0]).toMatchObject({
      team: { id: "ars" },
      played: 30,
      points: 71,
    });
    expect(table.rows.find((row) => row.team.id === "che")).toMatchObject({
      played: 30,
      points: 62,
    });
  });
});
