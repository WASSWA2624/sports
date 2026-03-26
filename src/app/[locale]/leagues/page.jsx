import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getLeagueDirectory } from "../../../lib/coreui/match-data";
import styles from "../../../components/coreui/competition-pages.module.css";

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
  const leagues = getLeagueDirectory();

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Competitions</p>
          <h1 className={styles.title}>Football leagues</h1>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{leagues.length} leagues</span>
        </div>
      </header>

      <div className={styles.directoryGrid}>
        {leagues.map((league) => (
          <Link key={league.code} href={`/${locale}/leagues/${league.code}`} className={styles.directoryCard}>
            <p className={styles.eyebrow}>{league.country}</p>
            <h2 className={styles.cardTitle}>{league.name}</h2>
            <p className={styles.cardMeta}>{league.teams.length} teams / {league.fixtures.length} matches</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
