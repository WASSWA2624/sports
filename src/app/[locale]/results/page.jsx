import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus, formatMatchday } from "../../../lib/coreui/format";
import { getResultsFeed } from "../../../lib/coreui/live-read";
import { FixtureFeedCard } from "../../../components/coreui/fixture-feed-card";
import styles from "../../../components/coreui/styles.module.css";

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
    "Results",
    "See final score snapshots, postponements, and cancellations across recent fixtures.",
    "/results"
  );
}

export default async function ResultsPage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const feed = await getResultsFeed({
    status: filters?.status,
    leagueCode: filters?.league,
  });
  const sections = groupFixturesByDay(feed.fixtures, locale);

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Frozen scorelines</p>
          <h1 className={styles.pageTitle}>{dictionary.recent}</h1>
          <p className={styles.pageLead}>
            Result cards hold the stored post-match snapshot so finished scorelines stay stable after
            capture.
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{feed.summary.total}</span>
          <span className={styles.badge}>{feed.summary.FINISHED} finals</span>
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
            All leagues
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
                <p className={styles.eyebrow}>Results</p>
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
        <div className={styles.emptyState}>
          No stored result snapshots match this filter yet. Try another league or status.
        </div>
      )}
    </section>
  );
}
