import Link from "next/link";
import { headers } from "next/headers";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getNewsModuleExperience } from "../../../lib/coreui/news-experience";
import { getLatestNewsModule } from "../../../lib/coreui/news-read";
import { getLiveMatchdayFeed } from "../../../lib/coreui/live-read";
import { resolveViewerTerritory } from "../../../lib/coreui/odds-broadcast";
import { LiveBoardGroupList } from "../../../components/coreui/live-board-group-list";
import { LiveBoardMonetization } from "../../../components/coreui/live-board-monetization";
import { LiveRefresh } from "../../../components/coreui/live-refresh";
import { NewsModule } from "../../../components/coreui/news-module";
import { PersonalizationUsageTracker } from "../../../components/coreui/personalization-usage-tracker";
import styles from "../../../components/coreui/styles.module.css";
import {
  getPersonalizationSnapshot,
  getPersonalizationUsage,
} from "../../../lib/personalization";

function buildLiveHref(locale, status, league, date, geo) {
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

  if (geo) {
    params.set("geo", geo);
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
  const viewerTerritory = resolveViewerTerritory({
    territory: filters?.geo,
    headers: await headers(),
  });
  const [feed, latestNews, personalization] = await Promise.all([
    getLiveMatchdayFeed({
      locale,
      status: filters?.status,
      leagueCode: filters?.league,
      date: filters?.date,
      viewerTerritory,
    }),
    getLatestNewsModule(),
    getPersonalizationSnapshot(),
  ]);
  const usage = getPersonalizationUsage(personalization);
  const selectedDateLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(feed.selectedDate));
  const liveNewsExperience = feed.flags?.liveNews
    ? await getNewsModuleExperience({
        locale,
        viewerTerritory,
        articles: latestNews.articles,
      })
    : { promo: null };

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
          href={buildLiveHref(
            locale,
            feed.selectedStatus,
            feed.selectedLeague,
            shiftDate(feed.selectedDate, -1),
            filters?.geo
          )}
          className={styles.filterChip}
        >
          {dictionary.previousDay}
        </Link>
        <span className={styles.filterChipActive}>{selectedDateLabel}</span>
        <Link
          href={buildLiveHref(
            locale,
            feed.selectedStatus,
            feed.selectedLeague,
            shiftDate(feed.selectedDate, 1),
            filters?.geo
          )}
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
            const href = buildLiveHref(
              locale,
              option.value,
              feed.selectedLeague,
              feed.selectedDate,
              filters?.geo
            );
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
            href={buildLiveHref(locale, feed.selectedStatus, "all", feed.selectedDate, filters?.geo)}
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
              href={buildLiveHref(
                locale,
                feed.selectedStatus,
                pivot.code,
                feed.selectedDate,
                filters?.geo
              )}
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

      <LiveBoardMonetization
        locale={locale}
        dictionary={dictionary}
        monetization={feed.monetization}
        surface="live-board"
      />

      <LiveBoardGroupList
        locale={locale}
        dictionary={dictionary}
        groups={feed.groups}
        monetization={feed.monetization}
        surface="live-board"
        emptyLabel={dictionary.liveFilterEmpty}
      />

      {feed.flags?.liveNews ? (
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
          trackingSurface="live-news-strip"
          promo={liveNewsExperience.promo}
        />
      ) : null}
    </section>
  );
}
