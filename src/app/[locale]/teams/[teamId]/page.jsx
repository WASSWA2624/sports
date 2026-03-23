import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getDictionary } from "../../../../lib/coreui/dictionaries";
import { getTeamDetail } from "../../../../lib/coreui/read";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import styles from "../../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale, teamId } = await params;
  const team = await getTeamDetail(teamId);

  return buildPageMetadata(
    locale,
    team?.name || "Team",
    team ? `Fixtures and standings snapshots for ${team.name}.` : "Team coverage page.",
    `/teams/${teamId}`
  );
}

export default async function TeamDetailPage({ params }) {
  const { locale, teamId } = await params;
  const dictionary = getDictionary(locale);
  const team = await getTeamDetail(teamId);

  if (!team) {
    notFound();
  }

  const fixtures = [...team.homeFor, ...team.awayFor]
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, 8);

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{team.league?.name || dictionary.teams}</p>
          <h1 className={styles.pageTitle}>{team.name}</h1>
        </div>
        {team.league ? (
          <Link href={`/${locale}/leagues/${team.league.code}`} className={styles.actionLink}>
            {team.league.name}
          </Link>
        ) : null}
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
          </div>
          {team.standings.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>League</th>
                  <th>#</th>
                  <th>P</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {team.standings.map((standing) => (
                  <tr key={standing.id}>
                    <td>{standing.season.league.name}</td>
                    <td>{standing.position}</td>
                    <td>{standing.played}</td>
                    <td>{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.recent}</p>
            <h2 className={styles.sectionTitle}>{dictionary.matchDetail}</h2>
          </div>
        </div>
        {fixtures.length ? (
          <div className={styles.fixtureGrid}>
            {fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>
    </section>
  );
}
