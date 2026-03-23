import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getLiveMatchdayFeed } from "../../../lib/coreui/live-read";
import { FixtureFeedCard } from "../../../components/coreui/fixture-feed-card";
import { LiveRefresh } from "../../../components/coreui/live-refresh";
import { FavoriteToggle } from "../../../components/coreui/favorite-toggle";
import styles from "../../../components/coreui/styles.module.css";

function buildLiveHref(locale, status, league, date) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") {
    params.set("status", status.toLowerCase());
  }

  if (league && league !== "all") {
    params.set("league", league);
  }

  if (date) {
    params.set("date", date);
  }

  const query = params.toString();
  return `/${locale}/live${query ? `?${query}` : ""}`;
}

function shiftDate(dateString, amount) {
  const next = new Date(`${dateString}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
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
    date: filters?.date,
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
            {feed.summary.LIVE} live, {feed.summary.SCHEDULED} scheduled, {feed.summary.FINISHED} final on{" "}
            {feed.selectedDate}.
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.liveBadge}>{feed.summary.LIVE}</span>
          <span className={styles.badge}>{feed.refresh.label}</span>
        </div>
      </header>

      <div className={styles.filterRow}>
        <Link
          href={buildLiveHref(locale, feed.selectedStatus, feed.selectedLeague, shiftDate(feed.selectedDate, -1))}
          className={styles.filterChip}
        >
          Previous day
        </Link>
        <span className={styles.filterChipActive}>{feed.selectedDate}</span>
        <Link
          href={buildLiveHref(locale, feed.selectedStatus, feed.selectedLeague, shiftDate(feed.selectedDate, 1))}
          className={styles.filterChip}
        >
          Next day
        </Link>
      </div>

      {feed.surfaceState.degraded ? (
        <div className={styles.infoBanner}>
          Live data is temporarily degraded. Showing the latest stored board snapshot.
        </div>
      ) : null}

      {feed.surfaceState.stale ? (
        <div className={styles.infoBanner}>
          {feed.surfaceState.staleCount} live fixture rows may be stale while provider updates catch up.
        </div>
      ) : null}

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
            const href = buildLiveHref(locale, option.value, feed.selectedLeague, feed.selectedDate);
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
            href={buildLiveHref(locale, feed.selectedStatus, "all", feed.selectedDate)}
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
              href={buildLiveHref(locale, feed.selectedStatus, pivot.code, feed.selectedDate)}
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

      {feed.groups.length ? (
        <div className={styles.section}>
          {feed.groups.map((group) => (
            <details key={group.key} open className={styles.boardGroup}>
              <summary className={styles.boardGroupSummary}>
                <div>
                  <p className={styles.eyebrow}>{group.country}</p>
                  <h2 className={styles.sectionTitle}>{group.leagueName}</h2>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={styles.badge}>{group.fixtures.length}</span>
                  <FavoriteToggle itemId={`competition:${group.leagueCode}`} locale={locale} />
                </div>
              </summary>

              <div className={styles.fixtureGrid}>
                {group.fixtures.map((fixture) => (
                  <FixtureFeedCard key={fixture.id} fixture={fixture} locale={locale} mode="live" />
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No fixtures match this board filter right now. Try another date, status, or competition.
        </div>
      )}
    </section>
  );
}
