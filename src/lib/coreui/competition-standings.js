const COMPLETED_STATUSES = new Set(["FINISHED"]);
const LIVE_STATUSES = new Set(["LIVE"]);

export const STANDING_VIEW_ORDER = ["overall", "home", "away", "form", "live"];

function hasScore(snapshot) {
  return Number.isFinite(snapshot?.homeScore) && Number.isFinite(snapshot?.awayScore);
}

function summarizeOutcome(goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) {
    return "W";
  }

  if (goalsFor < goalsAgainst) {
    return "L";
  }

  return "D";
}

function createTeamRecord(team) {
  return {
    id: team?.id || "team:unknown",
    name: team?.name || "Team",
    shortName: team?.shortName || team?.name || "Team",
    code: team?.code || null,
  };
}

function createRow(team) {
  return {
    team: createTeamRecord(team),
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  };
}

function cloneRow(row) {
  return {
    ...row,
    team: { ...row.team },
    form: [...(row.form || [])],
  };
}

function ensureRow(rows, team) {
  if (!team?.id) {
    return null;
  }

  if (!rows.has(team.id)) {
    rows.set(team.id, createRow(team));
  }

  return rows.get(team.id);
}

function applyScore(row, goalsFor, goalsAgainst, { trackForm = false } = {}) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;

  const result = summarizeOutcome(goalsFor, goalsAgainst);
  if (result === "W") {
    row.won += 1;
    row.points += 3;
  } else if (result === "L") {
    row.lost += 1;
  } else {
    row.drawn += 1;
    row.points += 1;
  }

  if (trackForm) {
    row.form.push(result);
  }
}

function extractTeamMap({ teams = [], standings = [], fixtures = [] } = {}) {
  const mapped = new Map();

  for (const team of teams) {
    if (team?.id) {
      mapped.set(team.id, createTeamRecord(team));
    }
  }

  for (const standing of standings) {
    if (standing?.team?.id) {
      mapped.set(standing.team.id, createTeamRecord(standing.team));
    }
  }

  for (const fixture of fixtures) {
    if (fixture?.homeTeam?.id) {
      mapped.set(fixture.homeTeam.id, createTeamRecord(fixture.homeTeam));
    }

    if (fixture?.awayTeam?.id) {
      mapped.set(fixture.awayTeam.id, createTeamRecord(fixture.awayTeam));
    }
  }

  return mapped;
}

function rankRows(rows) {
  return rows
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.goalDifference !== left.goalDifference) {
        return right.goalDifference - left.goalDifference;
      }

      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      return left.team.name.localeCompare(right.team.name);
    })
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }));
}

function collectCompletedFixtures(fixtures = []) {
  return fixtures
    .filter((fixture) => COMPLETED_STATUSES.has(fixture?.status) && hasScore(fixture?.resultSnapshot))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function collectLiveFixtures(fixtures = []) {
  return fixtures
    .filter((fixture) => LIVE_STATUSES.has(fixture?.status) && hasScore(fixture?.resultSnapshot))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function attachRecentForm(rows, completedFixtures) {
  if (!completedFixtures.length) {
    return rows;
  }

  const formMap = new Map();

  for (const row of rows) {
    const teamFixtures = completedFixtures
      .filter(
        (fixture) => fixture.homeTeam?.id === row.team.id || fixture.awayTeam?.id === row.team.id
      )
      .slice(-5);

    formMap.set(
      row.team.id,
      teamFixtures.map((fixture) => {
        const isHome = fixture.homeTeam?.id === row.team.id;
        const goalsFor = isHome
          ? fixture.resultSnapshot.homeScore
          : fixture.resultSnapshot.awayScore;
        const goalsAgainst = isHome
          ? fixture.resultSnapshot.awayScore
          : fixture.resultSnapshot.homeScore;

        return summarizeOutcome(goalsFor, goalsAgainst);
      })
    );
  }

  return rows.map((row) => ({
    ...row,
    form: formMap.get(row.team.id) || [],
  }));
}

function buildRowsFromFixtures(teamMap, fixtures, mode) {
  const rows = new Map();

  for (const team of teamMap.values()) {
    rows.set(team.id, createRow(team));
  }

  for (const fixture of fixtures) {
    const home = ensureRow(rows, fixture.homeTeam);
    const away = ensureRow(rows, fixture.awayTeam);

    if (!home || !away) {
      continue;
    }

    if (mode === "home") {
      applyScore(home, fixture.resultSnapshot.homeScore, fixture.resultSnapshot.awayScore);
      continue;
    }

    if (mode === "away") {
      applyScore(away, fixture.resultSnapshot.awayScore, fixture.resultSnapshot.homeScore);
      continue;
    }

    applyScore(home, fixture.resultSnapshot.homeScore, fixture.resultSnapshot.awayScore);
    applyScore(away, fixture.resultSnapshot.awayScore, fixture.resultSnapshot.homeScore);
  }

  return [...rows.values()];
}

function buildRowsFromForm(teamMap, fixtures) {
  const rows = new Map();

  for (const team of teamMap.values()) {
    rows.set(team.id, createRow(team));
  }

  for (const team of teamMap.values()) {
    const row = rows.get(team.id);
    const teamFixtures = fixtures
      .filter((fixture) => fixture.homeTeam?.id === team.id || fixture.awayTeam?.id === team.id)
      .slice(-5);

    for (const fixture of teamFixtures) {
      const isHome = fixture.homeTeam?.id === team.id;
      const goalsFor = isHome
        ? fixture.resultSnapshot.homeScore
        : fixture.resultSnapshot.awayScore;
      const goalsAgainst = isHome
        ? fixture.resultSnapshot.awayScore
        : fixture.resultSnapshot.homeScore;

      applyScore(row, goalsFor, goalsAgainst, { trackForm: true });
    }
  }

  return [...rows.values()];
}

function buildRowsFromStandings(teamMap, standings) {
  const rows = new Map();

  for (const team of teamMap.values()) {
    rows.set(team.id, createRow(team));
  }

  for (const standing of standings) {
    if (!standing?.team?.id) {
      continue;
    }

    rows.set(standing.team.id, {
      team: createTeamRecord(standing.team),
      played: standing.played || 0,
      won: standing.won || 0,
      drawn: standing.drawn || 0,
      lost: standing.lost || 0,
      goalsFor: standing.goalsFor || 0,
      goalsAgainst: standing.goalsAgainst || 0,
      goalDifference: (standing.goalsFor || 0) - (standing.goalsAgainst || 0),
      points: standing.points || 0,
      form: [],
      position: standing.position || null,
    });
  }

  return [...rows.values()];
}

function buildLiveRows(teamMap, standings, completedFixtures, liveFixtures) {
  const baseRows = standings.length
    ? buildRowsFromStandings(teamMap, standings).map(cloneRow)
    : buildRowsFromFixtures(teamMap, completedFixtures, "overall");
  const byTeamId = new Map(baseRows.map((row) => [row.team.id, row]));

  for (const fixture of liveFixtures) {
    const home = ensureRow(byTeamId, fixture.homeTeam);
    const away = ensureRow(byTeamId, fixture.awayTeam);

    if (!home || !away) {
      continue;
    }

    applyScore(home, fixture.resultSnapshot.homeScore, fixture.resultSnapshot.awayScore);
    applyScore(away, fixture.resultSnapshot.awayScore, fixture.resultSnapshot.homeScore);
  }

  return [...byTeamId.values()];
}

export function buildStandingTable({
  teams = [],
  standings = [],
  fixtures = [],
  view = "overall",
} = {}) {
  const teamMap = extractTeamMap({ teams, standings, fixtures });
  const completedFixtures = collectCompletedFixtures(fixtures);
  const liveFixtures = collectLiveFixtures(fixtures);
  const hasOverallData = standings.length > 0 || completedFixtures.length > 0;

  const availableViews = [];
  if (hasOverallData) {
    availableViews.push("overall");
  }
  if (completedFixtures.length > 0) {
    availableViews.push("home", "away", "form");
  }
  if ((standings.length > 0 || completedFixtures.length > 0) && liveFixtures.length > 0) {
    availableViews.push("live");
  }

  const selectedView = availableViews.includes(view) ? view : availableViews[0] || "overall";

  const tables = {
    overall: hasOverallData
      ? standings.length
        ? buildRowsFromStandings(teamMap, standings)
        : buildRowsFromFixtures(teamMap, completedFixtures, "overall")
      : [],
    home: completedFixtures.length ? buildRowsFromFixtures(teamMap, completedFixtures, "home") : [],
    away: completedFixtures.length ? buildRowsFromFixtures(teamMap, completedFixtures, "away") : [],
    form: completedFixtures.length ? buildRowsFromForm(teamMap, completedFixtures) : [],
    live:
      liveFixtures.length && (standings.length > 0 || completedFixtures.length > 0)
        ? buildLiveRows(teamMap, standings, completedFixtures, liveFixtures)
        : [],
  };

  const rows = attachRecentForm(tables[selectedView] || [], completedFixtures);

  return {
    selectedView,
    availableViews,
    rows: rankRows(rows).filter((row) => row.played > 0 || selectedView === "overall"),
    hasLiveData: liveFixtures.length > 0,
    hasCompletedData: completedFixtures.length > 0,
  };
}
