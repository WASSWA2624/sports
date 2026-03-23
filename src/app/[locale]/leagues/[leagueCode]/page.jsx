import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getDictionary } from "../../../../lib/coreui/dictionaries";
import { getLeagueDetail } from "../../../../lib/coreui/read";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import styles from "../../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale, leagueCode } = await params;
  const league = await getLeagueDetail(leagueCode);

  if (!league) {
    return buildPageMetadata(locale, "League", "League coverage page.", `/leagues/${leagueCode}`);
  }

  return buildPageMetadata(
    locale,
    league.name,
    `Standings, fixtures, and team directory for ${league.name}.`,
    `/leagues/${leagueCode}`
  );
}

export default async function LeagueDetailPage({ params }) {
  const { locale, leagueCode } = await params;
  const dictionary = getDictionary(locale);
  const league = await getLeagueDetail(leagueCode);

  if (!league) {
    notFound();
  }

  const standings = league.seasons[0]?.standings || [];

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{league.country || "International"}</p>
          <h1 className={styles.pageTitle}>{league.name}</h1>
        </div>
        <Link href={`/${locale}/tables`} className={styles.actionLink}>
          {dictionary.standings}
        </Link>
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
          </div>
          {standings.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position}</td>
                    <td>{row.team.name}</td>
                    <td>{row.played}</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.teams}</h2>
          </div>
          {league.teams.length ? (
            <div className={styles.teamGrid}>
              {league.teams.map((team) => (
                <Link key={team.id} href={`/${locale}/teams/${team.id}`} className={styles.teamCard}>
                  <p className={styles.cardTitle}>{team.name}</p>
                  <p className={styles.muted}>{team.shortName || team.code || league.name}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.overview}</p>
            <h2 className={styles.sectionTitle}>{dictionary.upcoming}</h2>
          </div>
        </div>
        {league.fixtures.length ? (
          <div className={styles.fixtureGrid}>
            {league.fixtures.map((fixture) => (
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
