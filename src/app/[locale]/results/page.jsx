import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../lib/coreui/feature-flags";
import { formatFixtureStatus, formatMatchday } from "../../../lib/coreui/format";
import { getLatestNewsModule } from "../../../lib/coreui/news-read";
import { getResultsFeed } from "../../../lib/coreui/live-read";
import { FixtureFeedCard } from "../../../components/coreui/fixture-feed-card";
import { NewsModule } from "../../../components/coreui/news-module";
import { PersonalizationUsageTracker } from "../../../components/coreui/personalization-usage-tracker";
import styles from "../../../components/coreui/styles.module.css";
import {
  getPersonalizationSnapshot,
  getPersonalizationUsage,
  sortFixturesByPersonalization,
} from "../../../lib/personalization";

function buildResultsHref(locale, status, league) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") {
    params.set("status", status.toLowerCase());
  }

  if (league && league !== "all") {
    params.set("league", league);
  }

  const query = params.toString();
  return `/${locale}/results${query ? `?${query}` : ""}`;
}

function groupFixturesByDay(fixtures, locale) {
  const groups = fixtures.reduce((accumulator, fixture) => {
    const key = new Date(fixture.startsAt).toISOString().slice(0, 10);
    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        label: formatMatchday(fixture.startsAt, locale),
        fixtures: [],
      });
    }

    accumulator.get(key).fixtures.push(fixture);
    return accumulator;
  }, new Map());

  return [...groups.values()];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaResultsTitle,
    getDictionary(locale).metaResultsDescription,
    "/results"
  );
}

export default async function ResultsPage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const [feed, latestNews, flags, personalization] = await Promise.all([
    getResultsFeed({
      locale,
      status: filters?.status,
      leagueCode: filters?.league,
    }),
    getLatestNewsModule(),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);
  const usage = getPersonalizationUsage(personalization);
  const sections = groupFixturesByDay(feed.fixtures, locale).map((section) => ({
    ...section,
    fixtures: sortFixturesByPersonalization(
      section.fixtures,
      personalization,
      (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
    ),
  }));

  return (
    <section className={styles.section}>
      <PersonalizationUsageTracker
        active={usage.hasFavorites || usage.hasRecentViews}
        surface="results-board"
        metadata={usage}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.resultsEyebrow}</p>
          <h1 className={styles.pageTitle}>{dictionary.recent}</h1>
          <p className={styles.pageLead}>{dictionary.resultsLead}</p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{feed.summary.total}</span>
          <span className={styles.badge}>
            {formatDictionaryText(dictionary.resultsFinals, {
              count: feed.summary.FINISHED,
            })}
          </span>
        </div>
      </header>

      <div className={styles.filterStack}>
        <div className={styles.filterRow}>
          {feed.statusOptions.map((option) => {
            const href = buildResultsHref(locale, option.value, feed.selectedLeague);
            const label =
              option.value === "ALL"
                ? dictionary.browseAll
                : formatFixtureStatus(option.value, locale);

            return (
              <Link
                key={option.value}
                href={href}
                className={
                  option.value === feed.selectedStatus ? styles.filterChipActive : styles.filterChip
                }
              >
                {label}
                <span className={styles.filterCount}>{option.count}</span>
              </Link>
            );
          })}
        </div>

        <div className={styles.filterRow}>
          <Link
            href={buildResultsHref(locale, feed.selectedStatus, "all")}
            className={feed.selectedLeague === "all" ? styles.filterChipActive : styles.filterChip}
          >
            {dictionary.allLeagues}
            <span className={styles.filterCount}>
              {feed.selectedStatus === "ALL"
                ? feed.summary.total
                : feed.statusOptions.find((option) => option.value === feed.selectedStatus)?.count || 0}
            </span>
          </Link>

          {feed.leaguePivots.map((pivot) => (
            <Link
              key={pivot.code}
              href={buildResultsHref(locale, feed.selectedStatus, pivot.code)}
              className={
                pivot.code === feed.selectedLeague ? styles.filterChipActive : styles.filterChip
              }
            >
              {pivot.label}
              <span className={styles.filterCount}>{pivot.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {sections.length ? (
        sections.map((section) => (
          <section key={section.key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.resultsSectionEyebrow}</p>
                <h2 className={styles.sectionTitle}>{section.label}</h2>
              </div>
              <span className={styles.badge}>{section.fixtures.length}</span>
            </div>

            <div className={styles.fixtureGrid}>
              {section.fixtures.map((fixture) => (
                <FixtureFeedCard key={fixture.id} fixture={fixture} locale={locale} mode="results" />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className={styles.emptyState}>{dictionary.resultsFilterEmpty}</div>
      )}

      {flags.resultsNews ? (
        <NewsModule
          locale={locale}
          eyebrow={dictionary.news}
          title={dictionary.newsScoreStripTitle}
          lead={dictionary.newsScoreStripLead}
          articles={latestNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="results-news-strip"
        />
      ) : null}
    </section>
  );
}
