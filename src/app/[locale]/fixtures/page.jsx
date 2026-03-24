import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../lib/coreui/feature-flags";
import { getNewsModuleExperience } from "../../../lib/coreui/news-experience";
import { getLatestNewsModule } from "../../../lib/coreui/news-read";
import { getUpcomingFixtures } from "../../../lib/coreui/read";
import {
  getPersonalizationSnapshot,
  getPersonalizationUsage,
  sortFixturesByPersonalization,
} from "../../../lib/personalization";
import { FixtureCard } from "../../../components/coreui/fixture-card";
import { NewsModule } from "../../../components/coreui/news-module";
import { PersonalizationUsageTracker } from "../../../components/coreui/personalization-usage-tracker";
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
  const [fixtures, latestNews, flags, personalization] = await Promise.all([
    getUpcomingFixtures(),
    getLatestNewsModule(),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);
  const usage = getPersonalizationUsage(personalization);
  const fixturesNewsExperience = flags.liveNews
    ? await getNewsModuleExperience({
        locale,
        articles: latestNews.articles,
      })
    : { promo: null };
  const prioritizedFixtures = sortFixturesByPersonalization(
    fixtures,
    personalization,
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );

  return (
    <section className={styles.section}>
      <PersonalizationUsageTracker
        active={usage.hasFavorites || usage.hasRecentViews}
        surface="fixtures-board"
        metadata={usage}
      />

      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.upcoming}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{prioritizedFixtures.length}</span>
        </div>
      </header>
      {prioritizedFixtures.length ? (
        <div className={styles.fixtureGrid}>
          {prioritizedFixtures.map((fixture) => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              locale={locale}
              showAlerts
              alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
              surface="fixtures-board"
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{dictionary.noData}</div>
      )}

      {flags.liveNews ? (
        <NewsModule
          locale={locale}
          dictionary={dictionary}
          eyebrow={dictionary.news}
          title={dictionary.newsScoreStripTitle}
          lead={dictionary.newsScoreStripLead}
          articles={latestNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="fixtures-news-strip"
          promo={fixturesNewsExperience.promo}
        />
      ) : null}
    </section>
  );
}
