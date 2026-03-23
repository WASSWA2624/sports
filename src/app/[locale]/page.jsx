import Link from "next/link";
import { buildPageMetadata } from "../../lib/coreui/metadata";
import { getDictionary } from "../../lib/coreui/dictionaries";
import { getHomeSnapshot } from "../../lib/coreui/read";
import { FixtureCard } from "../../components/coreui/fixture-card";
import styles from "../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, "Matchday Home", dictionary.heroBody, "");
}

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const snapshot = await getHomeSnapshot();
  const featuredLeagues = snapshot.leagues.slice(0, 3);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroMain}>
            <p className={styles.heroEyebrow}>{dictionary.seoSuffix}</p>
            <h1 className={styles.heroTitle}>{dictionary.heroTitle}</h1>
            <p className={styles.heroBody}>{dictionary.heroBody}</p>
            <div className={styles.heroActions}>
              <Link href={`/${locale}/live`} className={styles.actionLink}>
                {dictionary.liveNow}
              </Link>
              <Link href={`/${locale}/fixtures`} className={styles.secondaryAction}>
                {dictionary.upcoming}
              </Link>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <article className={styles.heroPanel}>
              <p className={styles.eyebrow}>Coverage map</p>
              <h2 className={styles.heroPanelTitle}>Built for quick scanning and deeper drill-downs.</h2>
              <div className={styles.heroMiniList}>
                {featuredLeagues.length ? (
                  featuredLeagues.map((league) => (
                    <Link
                      key={league.id}
                      href={`/${locale}/leagues/${league.code}`}
                      className={styles.heroMiniItem}
                    >
                      <span>{league.name}</span>
                      <small>{league.country || "International"}</small>
                    </Link>
                  ))
                ) : (
                  <>
                    <div className={styles.heroMiniItem}>
                      <span>Live score desk</span>
                      <small>Rapid match monitoring</small>
                    </div>
                    <div className={styles.heroMiniItem}>
                      <span>Fixture calendar</span>
                      <small>Clean scheduling overview</small>
                    </div>
                    <div className={styles.heroMiniItem}>
                      <span>League tables</span>
                      <small>Current standing snapshots</small>
                    </div>
                  </>
                )}
              </div>
            </article>

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
          </aside>
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
