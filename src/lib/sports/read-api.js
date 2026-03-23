import { getFixtureReadModel, getLeagueReadModel } from "./read";

export async function getLeagueWithFallback(code) {
  const league = await getLeagueReadModel(code);
  return (
    league || {
      code,
      coverage: {
        fixtures: "missing",
        standings: "missing",
        odds: "unavailable",
        broadcast: "unavailable",
      },
    }
  );
}

export async function getFixtureWithFallback(reference) {
  const fixture = await getFixtureReadModel(reference);
  return (
    fixture || {
      id: reference,
      coverage: {
        live: "missing",
        odds: "unavailable",
        broadcast: "unavailable",
        result: "missing",
      },
    }
  );
}
