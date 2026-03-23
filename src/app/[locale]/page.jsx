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
  const quickLinks = [
    { href: `/${locale}/live`, label: dictionary.liveNow, value: snapshot.liveFixtures.length },
    {
      href: `/${locale}/fixtures`,
      label: dictionary.upcoming,
      value: snapshot.upcomingFixtures.length,
    },
    { href: `/${locale}/results`, label: dictionary.recent, value: snapshot.recentResults.length },
    { href: `/${locale}/tables`, label: dictionary.standings, value: snapshot.leagues.length },
  ];

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroMain}>
            <p className={styles.heroEyebrow}>{dictionary.seoSuffix}</p>
            <h1 className={styles.heroTitle}>Matchday</h1>
            <div className={styles.heroPills}>
              <span className={styles.badge}>{snapshot.liveFixtures.length} live</span>
              <span className={styles.badge}>{snapshot.upcomingFixtures.length} next</span>
              <span className={styles.badge}>{snapshot.leagues.length} leagues</span>
            </div>
          </div>

          <div className={styles.heroActionGrid}>
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className={styles.heroActionCard}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{dictionary.liveNow}</h2>
          <div className={styles.sectionTools}>
            <span className={styles.badge}>{snapshot.liveFixtures.length}</span>
            <Link href={`/${locale}/live`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>
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
          <h2 className={styles.sectionTitle}>{dictionary.upcoming}</h2>
          <div className={styles.sectionTools}>
            <span className={styles.badge}>{snapshot.upcomingFixtures.length}</span>
            <Link href={`/${locale}/fixtures`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>
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
          <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
          <div className={styles.sectionTools}>
            <span className={styles.badge}>{snapshot.leagues.length}</span>
            <Link href={`/${locale}/leagues`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>
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
                  <span className={styles.badge}>{league.teams.length}</span>
                </div>
                <p className={styles.muted}>
                  {league.seasons[0]?.standings.length
                    ? league.seasons[0].standings[0].team.name
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
