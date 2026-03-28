import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchRow } from "../../../../components/coreui/scoreboard";
import boardStyles from "../../../../components/coreui/scoreboard.module.css";
import styles from "../../../../components/coreui/competition-pages.module.css";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getLeagueDetailFromProvider } from "../../../../lib/coreui/sports-data";

const META_SEPARATOR = " | ";

function buildGroupedFixtures(fixtures) {
  return fixtures.reduce((groups, fixture) => {
    const key = fixture.round || new Date(fixture.startsAt).toISOString().slice(0, 10);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: fixture.round || new Intl.DateTimeFormat("en", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(new Date(fixture.startsAt)),
        fixtures: [],
      });
    }

    groups.get(key).fixtures.push(fixture);
    return groups;
  }, new Map());
}

function filterFixtures(fixtures, view) {
  if (view === "live") {
    return fixtures.filter((fixture) => fixture.status === "LIVE");
  }

  if (view === "scheduled") {
    return fixtures.filter((fixture) => fixture.status === "SCHEDULED");
  }

  if (view === "finished") {
    return fixtures.filter((fixture) => fixture.status === "FINISHED");
  }

  return fixtures;
}

function buildLeagueTable(fixtures) {
  const table = new Map();

  function ensureTeam(team) {
    if (!table.has(team.slug)) {
      table.set(team.slug, {
        slug: team.slug,
        name: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
      });
    }

    return table.get(team.slug);
  }

  const finishedFixtures = [...fixtures]
    .filter(
      (fixture) =>
        fixture.status === "FINISHED" &&
        Number.isFinite(fixture.resultSnapshot?.homeScore) &&
        Number.isFinite(fixture.resultSnapshot?.awayScore)
    )
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  finishedFixtures.forEach((fixture) => {
    const home = ensureTeam(fixture.homeTeam);
    const away = ensureTeam(fixture.awayTeam);
    const homeGoals = fixture.resultSnapshot.homeScore;
    const awayGoals = fixture.resultSnapshot.awayScore;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
      home.form.push("W");
      away.form.push("L");
    } else if (homeGoals < awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
      home.form.push("L");
      away.form.push("W");
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
      home.form.push("D");
      away.form.push("D");
    }
  });

  return [...table.values()]
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
      form: entry.form.slice(-5).reverse(),
    }))
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

      return left.name.localeCompare(right.name);
    })
    .map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));
}

function getFormClassName(result) {
  if (result === "W") {
    return styles.tableFormWin;
  }

  if (result === "L") {
    return styles.tableFormLoss;
  }

  return styles.tableFormDraw;
}

function buildLeagueLead(league, table) {
  const liveCount = league.fixtureSummary.LIVE || 0;
  const scheduledCount = league.fixtureSummary.SCHEDULED || 0;
  const leader = table[0];

  const activityLabel =
    liveCount || scheduledCount
      ? `${liveCount} live and ${scheduledCount} upcoming matches`
      : `${league.fixtureSummary.FINISHED || 0} completed matches in the current snapshot`;

  if (!leader) {
    return `${league.country} competition with ${league.teams.length} tracked teams and ${activityLabel}.`;
  }

  return `${league.country} competition led by ${leader.name}, with ${league.teams.length} tracked teams and ${activityLabel}.`;
}

export async function generateMetadata({ params }) {
  const { locale, leagueCode } = await params;
  const league = await getLeagueDetailFromProvider(leagueCode);

  return buildPageMetadata(
    locale,
    league?.name || "League",
    league ? `Fixtures and results for ${league.name}.` : "Football competition page.",
    `/leagues/${leagueCode}`
  );
}

export default async function LeagueDetailPage({ params, searchParams }) {
  const { locale, leagueCode } = await params;
  const filters = await searchParams;
  const league = await getLeagueDetailFromProvider(leagueCode);

  if (!league) {
    notFound();
  }

  const view = ["all", "live", "scheduled", "finished"].includes(String(filters?.view || "all"))
    ? String(filters?.view || "all")
    : "all";
  const fixtures = filterFixtures(league.fixtures, view);
  const grouped = [...buildGroupedFixtures(fixtures).values()];
  const table = league.standings?.length ? league.standings : buildLeagueTable(league.fixtures);
  const topTeams = table.slice(0, 4);
  const summaryCards = [
    {
      key: "leader",
      label: "Leader",
      value: table[0]?.name || "Pending",
      meta: table[0]
        ? `${table[0].points} pts | ${table[0].goalDifference >= 0 ? "+" : ""}${table[0].goalDifference} GD`
        : "Standings will settle after finished matches",
    },
    {
      key: "matches",
      label: "Matches",
      value: `${league.fixtures.length}`,
      meta: `${league.fixtureSummary.LIVE || 0} live / ${league.fixtureSummary.SCHEDULED || 0} upcoming`,
    },
    {
      key: "clubs",
      label: "Teams",
      value: `${league.teams.length}`,
      meta: table.length ? `${table.length} sides with finished results` : "No completed table entries yet",
    },
    {
      key: "season",
      label: "Season",
      value: league.season,
      meta: `${league.country} competition board`,
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className={styles.chipRow}>
            <span className={styles.badge}>{league.country}</span>
            <span className={styles.badge}>{league.season}</span>
            <span className={styles.badge}>{league.fixtures.length} matches</span>
            <span className={styles.badge}>{league.teams.length} teams</span>
          </div>
          <p className={styles.eyebrow}>League</p>
          <h1 className={styles.title}>{league.name}</h1>
          <p className={styles.lead}>{buildLeagueLead(league, table)}</p>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.key} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{card.label}</span>
            <strong className={styles.summaryValue}>{card.value}</strong>
            <p className={styles.summaryMeta}>{card.meta}</p>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Overview</p>
            <h2 className={styles.sectionTitle}>Competition shortcuts</h2>
          </div>
        </div>

        <div className={styles.competitionGrid}>
          <article className={styles.competitionLink}>
            <p className={styles.eyebrow}>Standings</p>
            <h3>League table</h3>
            <p className={styles.competitionMeta}>
              {table.length ? `${table.length} clubs ranked from finished results.` : "No finished results yet."}
            </p>
          </article>
          <article className={styles.competitionLink}>
            <p className={styles.eyebrow}>Matchday</p>
            <h3>Fixtures & results</h3>
            <p className={styles.competitionMeta}>
              {league.fixtureSummary.total} total matches across live, scheduled, and final states.
            </p>
          </article>
          <article className={styles.competitionLink}>
            <p className={styles.eyebrow}>Clubs</p>
            <h3>Team directory</h3>
            <p className={styles.competitionMeta}>
              Jump directly into team pages from the current competition board.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Standings</p>
            <h2 className={styles.sectionTitle}>League table</h2>
          </div>
          <span className={styles.sectionCount}>{table.length}</span>
        </div>

        {table.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.leagueTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>Pts</th>
                  <th>Form</th>
                </tr>
              </thead>
              <tbody>
                {table.map((entry) => (
                  <tr key={entry.slug}>
                    <td>{entry.position}</td>
                    <td>
                      <Link href={`/${locale}/teams/${entry.slug}`} className={styles.tableTeamLink}>
                        {entry.name}
                      </Link>
                    </td>
                    <td>{entry.played}</td>
                    <td>{entry.wins}</td>
                    <td>{entry.draws}</td>
                    <td>{entry.losses}</td>
                    <td>{entry.goalsFor}</td>
                    <td>{entry.goalsAgainst}</td>
                    <td>{entry.goalDifference >= 0 ? `+${entry.goalDifference}` : entry.goalDifference}</td>
                    <td className={styles.tablePoints}>{entry.points}</td>
                    <td>
                      <div className={styles.tableFormRail}>
                        {entry.form.map((result, index) => (
                          <span key={`${entry.slug}-${index}`} className={getFormClassName(result)}>
                            {result}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>League table entries will appear here after the first finished matches land.</div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Clubs</p>
            <h2 className={styles.sectionTitle}>Top teams</h2>
          </div>
          <span className={styles.sectionCount}>{topTeams.length}</span>
        </div>

        <div className={styles.competitionGrid}>
          {(topTeams.length ? topTeams : table).map((team) => (
            <Link key={team.slug} href={`/${locale}/teams/${team.slug}`} className={styles.competitionLink}>
              <p className={styles.eyebrow}>Position {team.position}</p>
              <h3>{team.name}</h3>
              <p className={styles.competitionMeta}>
                {team.points} pts{META_SEPARATOR}
                {team.wins}-{team.draws}-{team.losses}
                {META_SEPARATOR}
                {team.goalsFor}:{team.goalsAgainst}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.chipRow}>
          {[
            { key: "all", label: "All" },
            { key: "live", label: "Live" },
            { key: "scheduled", label: "Fixtures" },
            { key: "finished", label: "Results" },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/${locale}/leagues/${league.code}${item.key === "all" ? "" : `?view=${item.key}`}`}
              className={item.key === view ? styles.tabChipActive : styles.tabChip}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {grouped.length ? (
        <div className={styles.fixtureGroups}>
          {grouped.map((group) => {
            const groupMeta = [league.country, `${group.fixtures.length} matches`].join(META_SEPARATOR);

            return (
              <section key={group.key} className={boardStyles.groupCard}>
                <div className={boardStyles.groupHeader}>
                  <h2 className={boardStyles.groupTitle}>{group.label}</h2>
                  <p className={boardStyles.groupMeta}>{groupMeta}</p>
                </div>
                <div className={boardStyles.matchList}>
                  {group.fixtures.map((fixture) => (
                    <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>No matches match this competition view right now.</div>
      )}
    </section>
  );
}
