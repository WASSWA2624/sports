import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../lib/coreui/feature-flags";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getLatestNewsModule } from "../../../lib/coreui/news-read";
import { getLiveMatchdayFeed } from "../../../lib/coreui/live-read";
import { buildCompetitionHref } from "../../../lib/coreui/routes";
import { FixtureFeedCard } from "../../../components/coreui/fixture-feed-card";
import { LiveRefresh } from "../../../components/coreui/live-refresh";
import { FavoriteToggle } from "../../../components/coreui/favorite-toggle";
import { NewsModule } from "../../../components/coreui/news-module";
import { PersonalizationUsageTracker } from "../../../components/coreui/personalization-usage-tracker";
import styles from "../../../components/coreui/styles.module.css";
import {
  getPersonalizationSnapshot,
  getPersonalizationUsage,
  sortCompetitionsByPersonalization,
  sortFixturesByPersonalization,
} from "../../../lib/personalization";

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
    getDictionary(locale).metaLiveTitle,
    getDictionary(locale).metaLiveDescription,
    "/live"
  );
}

export default async function LivePage({ params, searchParams }) {
  const { locale } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const [feed, latestNews, flags, personalization] = await Promise.all([
    getLiveMatchdayFeed({
      locale,
      status: filters?.status,
      leagueCode: filters?.league,
      date: filters?.date,
    }),
    getLatestNewsModule(),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);
  const usage = getPersonalizationUsage(personalization);
  const prioritizedGroups = sortCompetitionsByPersonalization(
    feed.groups.map((group) => ({
      ...group,
      fixtures: sortFixturesByPersonalization(
        group.fixtures,
        personalization,
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      ),
    })),
    personalization,
    (left, right) => (left.leagueName || "").localeCompare(right.leagueName || "")
  );
  const selectedDateLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(feed.selectedDate));

  return (
    <section className={styles.section}>
      <PersonalizationUsageTracker
        active={usage.hasFavorites || usage.hasRecentViews}
        surface="live-board"
        metadata={usage}
      />

      <LiveRefresh
        enabled={feed.refresh.enabled}
        intervalMs={feed.refresh.intervalMs}
        until={feed.refresh.until}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.livePageEyebrow}</p>
          <h1 className={styles.pageTitle}>{dictionary.liveNow}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.livePageLead, {
              live: feed.summary.LIVE,
              scheduled: feed.summary.SCHEDULED,
              finished: feed.summary.FINISHED,
              date: selectedDateLabel,
            })}
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
          {dictionary.previousDay}
        </Link>
        <span className={styles.filterChipActive}>{selectedDateLabel}</span>
        <Link
          href={buildLiveHref(locale, feed.selectedStatus, feed.selectedLeague, shiftDate(feed.selectedDate, 1))}
          className={styles.filterChip}
        >
          {dictionary.nextDay}
        </Link>
      </div>

      {feed.surfaceState.degraded ? (
        <div className={styles.infoBanner}>{dictionary.liveDataDegraded}</div>
      ) : null}

      {feed.surfaceState.stale ? (
        <div className={styles.infoBanner}>
          {formatDictionaryText(dictionary.liveDataStale, {
            count: feed.surfaceState.staleCount,
          })}
        </div>
      ) : null}

      <div className={styles.grid}>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.LIVE}</strong>
          <p className={styles.muted}>{dictionary.liveMatches}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.SCHEDULED}</strong>
          <p className={styles.muted}>{dictionary.kickoffWindow}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{feed.summary.FINISHED}</strong>
          <p className={styles.muted}>{dictionary.resultSnapshots}</p>
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

      {prioritizedGroups.length ? (
        <div className={styles.section}>
          {prioritizedGroups.map((group) => (
            <details key={group.key} open className={styles.boardGroup}>
              <summary className={styles.boardGroupSummary}>
                <div>
                  <p className={styles.eyebrow}>{group.country || dictionary.international}</p>
                  <h2 className={styles.sectionTitle}>
                    {group.leagueCode ? (
                      <Link href={buildCompetitionHref(locale, { code: group.leagueCode })}>
                        {group.leagueName || dictionary.competition}
                      </Link>
                    ) : (
                      group.leagueName || dictionary.competition
                    )}
                  </h2>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={styles.badge}>{group.fixtures.length}</span>
                  {group.leagueCode ? (
                    <FavoriteToggle
                      itemId={`competition:${group.leagueCode}`}
                      locale={locale}
                      label={group.leagueName || dictionary.competition}
                      metadata={{
                        country: group.country || null,
                      }}
                      surface="live-board"
                    />
                  ) : null}
                </div>
              </summary>

              <div className={styles.fixtureGrid}>
                {group.fixtures.map((fixture) => (
                  <FixtureFeedCard
                    key={fixture.id}
                    fixture={fixture}
                    locale={locale}
                    mode="live"
                    showLeague={false}
                  />
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{dictionary.liveFilterEmpty}</div>
      )}

      {flags.liveNews ? (
        <NewsModule
          locale={locale}
          eyebrow={dictionary.news}
          title={dictionary.newsScoreStripTitle}
          lead={dictionary.newsScoreStripLead}
          articles={latestNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="live-news-strip"
        />
      ) : null}
    </section>
  );
}
