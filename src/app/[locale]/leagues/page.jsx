import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getLeagueDirectory } from "../../../lib/coreui/read";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaLeaguesTitle,
    getDictionary(locale).metaLeaguesDescription,
    "/leagues"
  );
}

export default async function LeaguesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const leagues = await getLeagueDirectory();

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.leagues}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{leagues.length}</span>
        </div>
      </header>
      {leagues.length ? (
        <div className={styles.leagueGrid}>
          {leagues.map((league) => (
            <article key={league.id} className={styles.leagueCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
                  <h2 className={styles.cardTitle}>
                    <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                  </h2>
                </div>
                <span className={styles.badge}>{league.teams.length}</span>
              </div>
              <p className={styles.metaRow}>
                {league.fixtures[0]?.status
                  ? formatFixtureStatus(league.fixtures[0].status, locale)
                  : dictionary.noData}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{dictionary.noData}</div>
      )}
    </section>
  );
}
