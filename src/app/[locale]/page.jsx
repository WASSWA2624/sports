import Link from "next/link";
import { buildPageMetadata } from "../../lib/coreui/metadata";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { getHomeSnapshot } from "../../lib/coreui/read";
import { FixtureCard } from "../../components/coreui/fixture-card";
import styles from "../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.brand, dictionary.heroBody, "");
}

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const snapshot = await getHomeSnapshot();

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>{dictionary.seoSuffix}</p>
        <h1 className={styles.heroTitle}>{dictionary.heroTitle}</h1>
        <p className={styles.heroBody}>{dictionary.heroBody}</p>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <strong>{snapshot.liveFixtures.length}</strong>
            <span>{dictionary.liveNow}</span>
          </div>
          <div className={styles.statCard}>
            <strong>{snapshot.upcomingFixtures.length}</strong>
            <span>{dictionary.upcoming}</span>
          </div>
          <div className={styles.statCard}>
            <strong>{snapshot.leagues.length}</strong>
            <span>{dictionary.leagues}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.watchlist}</p>
            <h2 className={styles.sectionTitle}>{dictionary.liveNow}</h2>
          </div>
          <Link href={`/${locale}/live`} className={styles.sectionAction}>
            {dictionary.browseAll}
          </Link>
        </div>
        {snapshot.liveFixtures.length ? (
          <div className={styles.fixtureGrid}>
            {snapshot.liveFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.overview}</p>
            <h2 className={styles.sectionTitle}>{dictionary.upcoming}</h2>
          </div>
          <Link href={`/${locale}/fixtures`} className={styles.sectionAction}>
            {dictionary.browseAll}
          </Link>
        </div>
        {snapshot.upcomingFixtures.length ? (
          <div className={styles.fixtureGrid}>
            {snapshot.upcomingFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.leagues}</p>
            <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
          </div>
          <Link href={`/${locale}/leagues`} className={styles.sectionAction}>
            {dictionary.browseAll}
          </Link>
        </div>
        {snapshot.leagues.length ? (
          <div className={styles.leagueGrid}>
            {snapshot.leagues.map((league) => (
              <article key={league.id} className={styles.leagueCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{league.country || "International"}</p>
                    <h3 className={styles.cardTitle}>
                      <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                    </h3>
                  </div>
                  <span className={styles.badge}>{league.teams.length} teams</span>
                </div>
                <p className={styles.muted}>
                  {league.seasons[0]?.standings.length
                    ? `Current top side: ${league.seasons[0].standings[0].team.name}`
                    : dictionary.noData}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>
    </>
  );
}
