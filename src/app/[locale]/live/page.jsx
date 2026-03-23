import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getLiveMatchdayFeed } from "../../../lib/coreui/live-read";
import { FixtureFeedCard } from "../../../components/coreui/fixture-feed-card";
import { LiveRefresh } from "../../../components/coreui/live-refresh";
import styles from "../../../components/coreui/styles.module.css";

function buildLiveHref(locale, status, league) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") {
    params.set("status", status.toLowerCase());
  }

  if (league && league !== "all") {
    params.set("league", league);
  }

  const query = params.toString();
  return `/${locale}/live${query ? `?${query}` : ""}`;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    "Live Matches",
    "Follow live fixtures with status pivots, fast league filters, and active refresh windows.",
    "/live"
  );
}

export default async function LivePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const feed = await getLiveMatchdayFeed({
    status: filters?.status,
    leagueCode: filters?.league,
  });

  return (
    <section className={styles.section}>
      <LiveRefresh
        enabled={feed.refresh.enabled}
        intervalMs={feed.refresh.intervalMs}
        until={feed.refresh.until}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Matchday pulse</p>
          <h1 className={styles.pageTitle}>{dictionary.liveNow}</h1>
          <p className={styles.pageLead}>
            {feed.summary.LIVE} live, {feed.summary.SCHEDULED} on deck, {feed.summary.FINISHED} recent
            finals in the current match window.
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.liveBadge}>{feed.summary.LIVE}</span>
          <span className={styles.badge}>{feed.refresh.label}</span>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.LIVE}</strong>
          <p className={styles.muted}>Live matches</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.SCHEDULED}</strong>
          <p className={styles.muted}>Kickoff window</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.FINISHED}</strong>
          <p className={styles.muted}>Result snapshots</p>
        </article>
      </div>

      <div className={styles.filterStack}>
        <div className={styles.filterRow}>
          {feed.statusOptions.map((option) => {
            const href = buildLiveHref(locale, option.value, feed.selectedLeague);
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
            href={buildLiveHref(locale, feed.selectedStatus, "all")}
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
              href={buildLiveHref(locale, feed.selectedStatus, pivot.code)}
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

      {feed.fixtures.length ? (
        <div className={styles.fixtureGrid}>
          {feed.fixtures.map((fixture) => (
            <FixtureFeedCard key={fixture.id} fixture={fixture} locale={locale} mode="live" />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No fixtures match this live filter right now. Try a different status or league pivot.
        </div>
      )}
    </section>
  );
}
