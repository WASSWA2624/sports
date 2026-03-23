import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getLiveFixtures } from "../../../lib/coreui/read";
import { FixtureCard } from "../../../components/coreui/fixture-card";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    "Live Matches",
    "Follow live fixtures with scores, kickoff times, and detail links.",
    "/live"
  );
}

export default async function LivePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const fixtures = await getLiveFixtures();

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.liveNow}</p>
          <h1 className={styles.pageTitle}>{dictionary.liveNow}</h1>
          <p className={styles.pageLead}>
            Server-rendered live fixtures with watchlist actions and direct match pages.
          </p>
        </div>
        <span className={styles.liveBadge}>{fixtures.length} active</span>
      </header>
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
  );
}
