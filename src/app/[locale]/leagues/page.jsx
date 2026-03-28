import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getLeagueDirectoryFromProvider } from "../../../lib/coreui/sports-data";
import styles from "../../../components/coreui/competition-pages.module.css";
import { LeaguesDirectorySearch } from "../../../components/coreui/leagues-directory-search";

export async function generateMetadata({ params }) {
  const { locale } = await params;

  return buildPageMetadata(
    locale,
    "Leagues",
    "Browse football leagues and open fixtures or results by competition.",
    "/leagues"
  );
}

export default async function LeaguesPage({ params }) {
  const { locale } = await params;
  const leagues = await getLeagueDirectoryFromProvider();
  const totalTeams = leagues.reduce((sum, league) => sum + league.teams.length, 0);
  const totalMatches = leagues.reduce((sum, league) => sum + league.fixtures.length, 0);

  return (
    <section className={`${styles.page} ${styles.directoryPage}`}>
      <header className={`${styles.hero} ${styles.directoryHero}`}>
        <div className={styles.directoryHeroCopy}>
          <p className={styles.eyebrow}>Competitions</p>
          <h1 className={styles.title}>Football leagues</h1>
          <p className={styles.lead}>
            Jump between active competitions, scan coverage quickly, and open the league board that matters now.
          </p>
        </div>

        <div className={styles.directorySummaryGrid}>
          <div className={styles.directorySummaryCard}>
            <span>Competitions</span>
            <strong>{leagues.length}</strong>
            <small>Leagues live in this board</small>
          </div>
          <div className={styles.directorySummaryCard}>
            <span>Clubs</span>
            <strong>{totalTeams}</strong>
            <small>Tracked teams across leagues</small>
          </div>
          <div className={styles.directorySummaryCard}>
            <span>Matches</span>
            <strong>{totalMatches}</strong>
            <small>Available fixtures and results</small>
          </div>
        </div>
      </header>

      <LeaguesDirectorySearch locale={locale} leagues={leagues} />
    </section>
  );
}
