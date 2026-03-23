import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../lib/coreui/feature-flags";
import { getLatestNewsModule } from "../../../lib/coreui/news-read";
import { getUpcomingFixtures } from "../../../lib/coreui/read";
import { FixtureCard } from "../../../components/coreui/fixture-card";
import { NewsModule } from "../../../components/coreui/news-module";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaFixturesTitle,
    getDictionary(locale).metaFixturesDescription,
    "/fixtures"
  );
}

export default async function FixturesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [fixtures, latestNews, flags] = await Promise.all([
    getUpcomingFixtures(),
    getLatestNewsModule(),
    getPublicSurfaceFlags(),
  ]);

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.upcoming}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{fixtures.length}</span>
        </div>
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

      {flags.news ? (
        <NewsModule
          locale={locale}
          eyebrow={dictionary.news}
          title={dictionary.newsScoreStripTitle}
          lead={dictionary.newsScoreStripLead}
          articles={latestNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
        />
      ) : null}
    </section>
  );
}
