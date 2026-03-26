import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getLeagueDirectory } from "../../../lib/coreui/read";
import styles from "../../../components/coreui/competition-pages.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.metaLeaguesTitle,
    dictionary.metaLeaguesDescription,
    "/leagues"
  );
}

export default async function LeaguesPage({ params }) {
  const { locale } = await params;
  const leagues = await getLeagueDirectory();

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Competitions</p>
          <h1 className={styles.title}>Football leagues</h1>
          <p className={styles.lead}>
            Browse current football competitions, then open a league page for upcoming fixtures and recent results.
          </p>
        </div>

        <div className={styles.sectionTools}>
          <span className={styles.badge}>{leagues.length} leagues</span>
        </div>
      </header>

      {leagues.length ? (
        <div className={styles.directoryGrid}>
          {leagues.map((league) => (
            <Link key={league.id} href={`/${locale}/leagues/${league.code}`} className={styles.directoryCard}>
              <p className={styles.eyebrow}>{league.country || "International"}</p>
              <h2 className={styles.cardTitle}>{league.name}</h2>
              <p className={styles.cardMeta}>
                {league.teams.length} teams
                {league.fixtures[0]?.status ? ` • ${league.fixtures[0].status.toLowerCase()}` : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>No football leagues are available right now.</div>
      )}
    </section>
  );
}
