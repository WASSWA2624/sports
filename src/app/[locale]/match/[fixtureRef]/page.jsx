import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AlertSubscriptionControl } from "../../../../components/coreui/alert-subscription-control";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import { LiveRefresh } from "../../../../components/coreui/live-refresh";
import { ModuleEngagementTracker } from "../../../../components/coreui/module-engagement-tracker";
import { NewsModule } from "../../../../components/coreui/news-module";
import { OddsPredictionWidgets } from "../../../../components/coreui/odds-prediction-widgets";
import { RecentViewTracker } from "../../../../components/coreui/recent-view-tracker";
import { RegulatedContentGate } from "../../../../components/coreui/regulated-content-gate";
import { StandingsTable } from "../../../../components/coreui/standings-table";
import { StructuredData } from "../../../../components/coreui/structured-data";
import { TrackedActionLink } from "../../../../components/coreui/tracked-action-link";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import styles from "../../../../components/coreui/styles.module.css";
import {
  formatDictionaryText,
  getDictionary,
  getStandingViewLabel,
} from "../../../../lib/coreui/dictionaries";
import { getRelatedMatchesModule } from "../../../../lib/coreui/discovery";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import {
  formatFixtureStatus,
  formatKickoff,
  formatSnapshotTime,
} from "../../../../lib/coreui/format";
import { getLiveMatchDetail } from "../../../../lib/coreui/live-read";
import {
  buildBreadcrumbStructuredData,
  buildPageMetadata,
  buildSportsEventStructuredData,
} from "../../../../lib/coreui/metadata";
import { getFixtureNewsModule } from "../../../../lib/coreui/news-read";
import { getNewsModuleExperience } from "../../../../lib/coreui/news-experience";
import { resolveViewerTerritory } from "../../../../lib/coreui/odds-broadcast";
import { getPersonalizationSnapshot, sortFixturesByPersonalization } from "../../../../lib/personalization";

const VALID_TABS = ["match", "h2h", "standings", "video"];

function coverageTone(state) {
  if (state === "available") {
    return styles.coverageAvailable;
  }

  if (state === "stale") {
    return styles.surfaceStateStale;
  }

  if (state === "region_restricted") {
    return styles.surfaceStateRestricted;
  }

  return styles.coverageMissing;
}

function coverageLabel(state, dictionary) {
  if (state === "available") {
    return dictionary.coverageReady;
  }

  if (state === "stale") {
    return dictionary.coverageStale;
  }

  if (state === "region_restricted") {
    return dictionary.coverageRestricted;
  }

  return dictionary.coverageUnavailable;
}

function getSideLabel(side, dictionary) {
  if (side === "home") {
    return dictionary.homeSide;
  }

  if (side === "away") {
    return dictionary.awaySide;
  }

  return dictionary.matchSide;
}

function normalizeTab(value) {
  if (!value) {
    return "match";
  }

  return VALID_TABS.includes(value) ? value : "match";
}

function buildMatchPageHref(locale, fixtureReference, { tab, standing, territory } = {}) {
  const params = new URLSearchParams();

  if (tab && tab !== "match") {
    params.set("tab", tab);
  }

  if (standing && standing !== "overall") {
    params.set("standing", standing);
  }

  if (territory) {
    params.set("territory", territory);
  }

  const query = params.toString();
  return `/${locale}/match/${fixtureReference}${query ? `?${query}` : ""}`;
}

export async function generateMetadata({ params }) {
  const { locale, fixtureRef } = await params;
  const fixture = await getLiveMatchDetail(fixtureRef, locale, undefined, {
    includeMatchCentre: false,
    includeExperience: false,
  });
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    fixture ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}` : dictionary.metaMatchFallbackTitle,
    fixture
      ? formatDictionaryText(dictionary.metaMatchDescription, {
          home: fixture.homeTeam.name,
          away: fixture.awayTeam.name,
        })
      : dictionary.metaMatchFallbackDescription,
    `/match/${fixtureRef}`,
    {
      keywords: [
        fixture?.homeTeam?.name,
        fixture?.awayTeam?.name,
        fixture?.league?.name,
      ].filter(Boolean),
    }
  );
}

export default async function MatchDetailPage({ params, searchParams }) {
  const { locale, fixtureRef } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const activeTab = normalizeTab(filters?.tab);
  const selectedStandingView = filters?.standing || "overall";
  const viewerTerritory = resolveViewerTerritory({
    territory: filters?.territory,
    headers: await headers(),
  });
  const [fixture, flags, personalization] = await Promise.all([
    getLiveMatchDetail(fixtureRef, locale, viewerTerritory, {
      standingsView: selectedStandingView,
      includeMatchCentre: true,
    }),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);

  if (!fixture) {
    notFound();
  }

  const [relatedMatchesRaw, relatedNews] = await Promise.all([
    getRelatedMatchesModule(
      {
        fixtureId: fixture.id,
        leagueId: fixture.leagueId,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
      },
      6
    ),
    flags.news
      ? getFixtureNewsModule(
          {
            fixtureId: fixture.id,
            competitionId: fixture.competitionId,
            teamIds: [fixture.homeTeamId, fixture.awayTeamId],
          },
          4
        )
      : Promise.resolve({ articles: [], total: 0 }),
  ]);
  const relatedMatches = sortFixturesByPersonalization(
    relatedMatchesRaw,
    personalization,
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );

  const detail = fixture.detail;
  const matchCentre = fixture.matchCentre;
  const odds = fixture.odds;
  const broadcast = fixture.broadcast;
  const relatedNewsExperience = flags.news
    ? await getNewsModuleExperience({
        locale,
        viewerTerritory,
        articles: relatedNews.articles,
        entityContext: {
          fixture,
          competition: fixture.league,
          entityType: "fixture",
          entityId: fixture.id,
        },
      })
    : { promo: null };
  const coverage = [
    { label: dictionary.timeline, state: detail.coverage.timeline === "available" ? "available" : "unavailable" },
    { label: dictionary.statistics, state: detail.coverage.statistics === "available" ? "available" : "unavailable" },
    { label: dictionary.lineups, state: detail.coverage.lineups === "available" ? "available" : "unavailable" },
    { label: dictionary.keyEvents, state: detail.coverage.keyEvents === "available" ? "available" : "unavailable" },
    { label: dictionary.fixtureOdds, state: odds.state },
    { label: dictionary.broadcastGuide, state: broadcast.state },
  ];
  const hasLineups =
    detail.lineups.home.starters.length ||
    detail.lineups.home.bench.length ||
    detail.lineups.away.starters.length ||
    detail.lineups.away.bench.length;
  const shouldGateOdds = odds.enabled && odds.groups.length > 0;
  const supportedAlertTypes = [
    "KICKOFF",
    detail.coverage.keyEvents === "available" ? "GOAL" : null,
    detail.coverage.keyEvents === "available" ? "CARD" : null,
    detail.coverage.timeline === "available" ? "PERIOD_CHANGE" : null,
    "FINAL_RESULT",
    relatedNews.total ? "NEWS" : null,
  ].filter(Boolean);
  const fixtureLabel = `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`;
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      { name: fixture.league.name, path: `/${locale}/leagues/${fixture.league.code}` },
      { name: fixtureLabel, path: `/${locale}/match/${fixture.externalRef || fixture.id}` },
    ]),
    buildSportsEventStructuredData({
      path: `/${locale}/match/${fixture.externalRef || fixture.id}`,
      name: fixtureLabel,
      description: formatDictionaryText(dictionary.metaMatchDescription, {
        home: fixture.homeTeam.name,
        away: fixture.awayTeam.name,
      }),
      startDate: fixture.startsAt,
      status: fixture.status,
      competition: fixture.league.name,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      location: fixture.venue,
    }),
  ];
  const hasMatchInsights = Boolean(
    odds.insights?.bestBet ||
      odds.insights?.topPicks?.length ||
      odds.insights?.valueBets?.length ||
      odds.insights?.bestOdds?.length ||
      odds.insights?.highOddsMatches?.length ||
      odds.ctaConfig?.primaryAffiliate?.href ||
      odds.ctaConfig?.funnelActions?.length ||
      broadcast.quickActions?.primary ||
      broadcast.quickActions?.message
  );
  const fixtureReference = fixture.externalRef || fixture.id;
  const topOdds = odds.insights?.bestOdds?.slice(0, 3) || [];
  const headToHead = matchCentre?.h2h || null;
  const standingRows = matchCentre?.standingsTable?.rows || [];
  const standingViews = matchCentre?.standingsTable?.availableViews || [];
  const focusRows = matchCentre?.focusedRows || [];

  const oddsContent = (
    <div className={styles.surfaceStack}>
      <div className={styles.surfaceSummary}>
        <span className={styles.badge}>
          {dictionary.oddsSourcesLabel}: {odds.summary.bookmakerCount}
        </span>
        <span className={styles.badge}>{viewerTerritory}</span>
        {odds.lastUpdatedAt ? (
          <span className={styles.badge}>
            {formatDictionaryText(dictionary.oddsLastUpdated, {
              time: formatSnapshotTime(odds.lastUpdatedAt, locale),
            })}
          </span>
        ) : null}
      </div>

      {odds.message ? <div className={styles.infoBanner}>{odds.message}</div> : null}

      {odds.bookmakers?.length ? (
        <div className={styles.inlineBadgeRow}>
          {odds.bookmakers.slice(0, 6).map((bookmaker) => (
            <span key={bookmaker.key} className={styles.legalChip}>
              {bookmaker.shortName || bookmaker.name}
            </span>
          ))}
        </div>
      ) : null}

      {odds.groups.length ? (
        <div className={styles.surfaceRows}>
          {odds.groups.map((group) => (
            <article key={group.id} className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{group.label}</h3>
                  <p className={styles.muted}>{group.sources.join(" · ")}</p>
                </div>
                <span className={styles.badge}>{group.markets.length}</span>
              </div>

              <div className={styles.surfaceRowsCompact}>
                {group.markets.map((market) => (
                    <div key={market.id} className={styles.surfacePanel}>
                      <div className={styles.cardHeader}>
                        <strong>{market.bookmaker}</strong>
                        <span className={styles.badge}>
                          {market.suspended ? dictionary.marketSuspended : dictionary.marketOpen}
                      </span>
                    </div>
                    <div className={styles.selectionGrid}>
                      {market.selections.map((selection) => (
                        <div key={selection.id} className={styles.selectionCard}>
                          <strong>{selection.label}</strong>
                          {selection.line ? <span className={styles.muted}>{selection.lineLabel}</span> : null}
                          <span className={selection.isActive ? styles.summaryValue : styles.muted}>
                            {selection.priceLabel || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {market.featuredSelection ? (
                      <div className={styles.insightSplit}>
                        <span className={styles.insightMetric}>
                          {dictionary.bestPrice}: {market.featuredSelection.label}
                        </span>
                        <strong className={styles.insightPrice}>{market.featuredSelection.priceLabel}</strong>
                      </div>
                    ) : null}
                    {market.cta?.href ? (
                      <TrackedActionLink
                        href={market.cta.href}
                        external={market.cta.external}
                        className={styles.actionLink}
                        analyticsEvent="odds_cta_click"
                        analyticsSurface="match-detail"
                        analyticsEntityType="fixture"
                        analyticsEntityId={fixture.id}
                        analyticsAction={`fixture-market:${market.bookmaker}`}
                        analyticsMetadata={{
                          fixtureId: fixture.id,
                          marketType: market.marketType,
                        }}
                        affiliateClick={market.cta}
                      >
                        {dictionary.betNow}
                      </TrackedActionLink>
                    ) : null}
                  </div>
                ))}
              </div>

              {group.comparison?.bestPriceLabel ? (
                <div className={styles.insightMeta}>
                  <span className={styles.insightMetric}>
                    {dictionary.bestPrice}: {group.comparison.bestPriceLabel}
                  </span>
                  {group.comparison.bestSelectionLabel ? (
                    <span className={styles.badge}>{group.comparison.bestSelectionLabel}</span>
                  ) : null}
                  {group.primaryCta?.href ? (
                    <TrackedActionLink
                      href={group.primaryCta.href}
                      external={group.primaryCta.external}
                      className={styles.sectionAction}
                      analyticsEvent="odds_cta_click"
                      analyticsSurface="match-detail"
                      analyticsEntityType="fixture"
                      analyticsEntityId={fixture.id}
                      analyticsAction={`fixture-group:${group.label}`}
                      analyticsMetadata={{
                        fixtureId: fixture.id,
                        groupId: group.id,
                      }}
                      affiliateClick={group.primaryCta}
                    >
                      {dictionary.betNow}
                    </TrackedActionLink>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{odds.message || dictionary.oddsUnavailable}</div>
      )}

      <div className={styles.legalStack}>
        {odds.legal.legalLines.map((line) => (
          <span key={line} className={styles.legalChip}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

      <LiveRefresh
        enabled={detail.refresh.enabled}
        intervalMs={detail.refresh.intervalMs}
        until={detail.refresh.until}
      />

      <RecentViewTracker
        itemId={`fixture:${fixture.id}`}
        label={fixtureLabel}
        metadata={{
          leagueCode: fixture.league.code,
        }}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{fixture.league.name}</p>
          <h1 className={styles.pageTitle}>{fixtureLabel}</h1>
          <p className={styles.pageLead}>{dictionary.matchLead}</p>
        </div>
        <div className={styles.sectionTools}>
          <FavoriteToggle
            itemId={`fixture:${fixture.id}`}
            locale={locale}
            label={fixtureLabel}
            metadata={{
              leagueCode: fixture.league.code,
            }}
            surface="match-detail"
          />
          <AlertSubscriptionControl
            itemId={`fixture:${fixture.id}`}
            locale={locale}
            supportedTypes={supportedAlertTypes}
            label={fixtureLabel}
            metadata={{
              leagueCode: fixture.league.code,
            }}
            surface="match-detail"
          />
        </div>
      </header>

      <div className={styles.filterStack}>
        <div className={styles.filterRow}>
          {[
            { key: "match", label: dictionary.match },
            { key: "h2h", label: dictionary.matchHeadToHead },
            { key: "standings", label: dictionary.standings },
            { key: "video", label: dictionary.matchVideo },
          ].map((item) => (
            <Link
              key={item.key}
              href={buildMatchPageHref(locale, fixtureReference, {
                tab: item.key,
                standing: matchCentre?.standingsTable?.selectedView,
                territory: filters?.territory,
              })}
              className={item.key === activeTab ? styles.filterChipActive : styles.filterChip}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.overview}</h2>
            <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>
              {formatFixtureStatus(fixture.status, locale)}
            </span>
          </div>

          <div className={styles.scoreboard}>
            <div className={styles.scoreboardTeam}>
              <span>{fixture.homeTeam.name}</span>
              <strong>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
            </div>
            <div className={styles.scoreboardDivider}>-</div>
            <div className={styles.scoreboardTeam}>
              <span>{fixture.awayTeam.name}</span>
              <strong>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
            </div>
          </div>

          <div className={styles.metaChips}>
            {detail.liveState.minuteLabel ? (
              <span className={styles.liveBadge}>{detail.liveState.minuteLabel}</span>
            ) : null}
            {detail.liveState.statusText ? <span className={styles.badge}>{detail.liveState.statusText}</span> : null}
            {detail.resultFreeze.isFrozen ? (
              <span className={styles.badge}>
                {formatDictionaryText(dictionary.snapshotFrozenLabel, {
                  time: formatSnapshotTime(detail.resultFreeze.frozenAt, locale),
                })}
              </span>
            ) : null}
            {!detail.resultFreeze.isFrozen && detail.refresh.label ? (
              <span className={styles.badge}>{detail.refresh.label}</span>
            ) : null}
          </div>

          <div className={styles.detailMeta}>
            <span>{formatKickoff(fixture.startsAt, locale)}</span>
            {fixture.venue ? <span>{fixture.venue}</span> : null}
            {fixture.round ? <span>{fixture.round}</span> : null}
            {detail.liveState.reason ? <span>{detail.liveState.reason}</span> : null}
          </div>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.competitionSection}</h2>
          </div>

          <div className={styles.linkList}>
            <Link href={`/${locale}/leagues/${fixture.league.code}`} className={styles.actionLink}>
              {fixture.league.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.homeTeam.id}`} className={styles.badge}>
              {fixture.homeTeam.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.awayTeam.id}`} className={styles.badge}>
              {fixture.awayTeam.name}
            </Link>
          </div>

          <div className={styles.inlineBadgeRow}>
            <FavoriteToggle
              itemId={`competition:${fixture.league.code}`}
              locale={locale}
              compact
              label={fixture.league.name}
              surface="match-detail"
            />
            <FavoriteToggle
              itemId={`team:${fixture.homeTeam.id}`}
              locale={locale}
              compact
              label={fixture.homeTeam.name}
              metadata={{ leagueCode: fixture.league.code }}
              surface="match-detail"
            />
            <FavoriteToggle
              itemId={`team:${fixture.awayTeam.id}`}
              locale={locale}
              compact
              label={fixture.awayTeam.name}
              metadata={{ leagueCode: fixture.league.code }}
              surface="match-detail"
            />
          </div>

          <div className={styles.coverageGrid}>
            {coverage.map((entry) => (
              <div key={entry.label} className={styles.coverageItem}>
                <span>{entry.label}</span>
                <strong className={coverageTone(entry.state)}>{coverageLabel(entry.state, dictionary)}</strong>
              </div>
            ))}
          </div>

          {matchCentre?.venue || matchCentre?.referee || headToHead ? (
            <div className={styles.coverageGrid}>
              {matchCentre?.venue ? (
                <div className={styles.coverageItem}>
                  <span>{dictionary.venue}</span>
                  <strong>{matchCentre.venue.name}</strong>
                </div>
              ) : null}
              {matchCentre?.referee ? (
                <div className={styles.coverageItem}>
                  <span>{dictionary.referee}</span>
                  <strong>{matchCentre.referee.name}</strong>
                </div>
              ) : null}
              {headToHead ? (
                <div className={styles.coverageItem}>
                  <span>{dictionary.matchHeadToHead}</span>
                  <strong>
                    {headToHead.homeWins}-{headToHead.awayWins}-{headToHead.draws}
                  </strong>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>

      {activeTab === "match" && hasMatchInsights ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.matchInsights}</p>
              <h2 className={styles.sectionTitle}>{dictionary.matchInsights}</h2>
              <p className={styles.sectionLead}>{dictionary.matchInsightsLead}</p>
            </div>
            {odds.bookmakers?.length ? <span className={styles.badge}>{odds.bookmakers.length}</span> : null}
          </div>

          <OddsPredictionWidgets
            locale={locale}
            dictionary={dictionary}
            surface="match-detail"
            entityType="fixture"
            entityId={fixture.id}
            insights={odds.insights}
            ctaConfig={odds.ctaConfig}
            broadcastQuickActions={broadcast.quickActions}
            showBestBet
          />
        </section>
      ) : null}

      {activeTab === "match" ? (
        <section id="match-odds" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.match}</p>
              <h2 className={styles.sectionTitle}>{dictionary.relatedMatchesTitle}</h2>
              <p className={styles.sectionLead}>{dictionary.relatedMatchesLead}</p>
            </div>
            <span className={styles.badge}>{relatedMatches.length}</span>
          </div>

          {relatedMatches.length ? (
            <div className={styles.fixtureGrid}>
              {relatedMatches.map((relatedFixture) => (
                <FixtureCard
                  key={relatedFixture.id}
                  fixture={relatedFixture}
                  locale={locale}
                  showAlerts
                  alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                  surface="match-detail"
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}

      {activeTab === "match" && flags.news ? (
        <NewsModule
          locale={locale}
          dictionary={dictionary}
          eyebrow={dictionary.news}
          title={dictionary.relatedNewsTitle}
          lead={dictionary.relatedNewsLead}
          articles={relatedNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="match-news-module"
          promo={relatedNewsExperience.promo}
        />
      ) : null}

      {activeTab === "match" ? (
        <section id="match-broadcast" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.highlights}</p>
              <h2 className={styles.sectionTitle}>{dictionary.keyEvents}</h2>
            </div>
            <span className={styles.badge}>{detail.keyEvents.length}</span>
          </div>

          {detail.keyEvents.length ? (
            <div className={styles.eventGrid}>
              {detail.keyEvents.map((event) => (
                <article key={event.id} className={styles.panel}>
                  <div className={styles.cardHeader}>
                    <span
                      className={
                        event.side === "home"
                          ? styles.homeMarker
                          : event.side === "away"
                            ? styles.awayMarker
                            : styles.badge
                      }
                    >
                      {getSideLabel(event.side, dictionary)}
                    </span>
                    {event.minuteLabel ? <span className={styles.badge}>{event.minuteLabel}</span> : null}
                  </div>
                  <h3 className={styles.cardTitle}>{event.title}</h3>
                  {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                  {event.secondaryActor ? (
                    <p className={styles.muted}>
                      {formatDictionaryText(dictionary.eventWith, { name: event.secondaryActor })}
                    </p>
                  ) : null}
                  <p className={styles.fixtureSummary}>{event.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.eventCoveragePending}</div>
          )}
        </section>
      ) : null}

      {activeTab === "match" ? (
        <div className={styles.analysisGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.timeline}</h2>
            <span className={styles.badge}>{detail.timeline.length}</span>
          </div>

          {detail.timeline.length ? (
            <div className={styles.timeline}>
              {detail.timeline.map((event) => (
                <div key={event.id} className={styles.timelineItem}>
                  <div className={styles.timelineMinute}>{event.minuteLabel || dictionary.play}</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.cardHeader}>
                      <strong>{event.title}</strong>
                      <span
                        className={
                          event.side === "home"
                            ? styles.homeMarker
                            : event.side === "away"
                              ? styles.awayMarker
                              : styles.badge
                        }
                      >
                        {getSideLabel(event.side, dictionary)}
                      </span>
                    </div>
                    {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                    {event.secondaryActor ? (
                      <p className={styles.muted}>
                        {formatDictionaryText(dictionary.eventRelated, { name: event.secondaryActor })}
                      </p>
                    ) : null}
                    <p className={styles.fixtureSummary}>{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.timelinePending}</div>
          )}
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.statistics}</h2>
            <span className={styles.badge}>{detail.statistics.length}</span>
          </div>

          {detail.statistics.length ? (
            <div className={styles.statRows}>
              {detail.statistics.map((entry) => (
                <div key={entry.key} className={styles.statRow}>
                  <span className={styles.statValue}>{entry.home || "-"}</span>
                  <div className={styles.statMeter}>
                    <strong>{entry.label}</strong>
                    <div className={styles.statBars}>
                      <span
                        className={styles.statBarHome}
                        style={{ width: `${entry.homeShare}%` }}
                      />
                      <span
                        className={styles.statBarAway}
                        style={{ width: `${entry.awayShare}%` }}
                      />
                    </div>
                  </div>
                  <span className={styles.statValue}>{entry.away || "-"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.statisticsPending}</div>
          )}
        </article>
        </div>
      ) : null}

      {activeTab === "match" ? (
        <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.squads}</p>
            <h2 className={styles.sectionTitle}>{dictionary.lineups}</h2>
          </div>
          <span className={styles.badge}>
            {detail.lineups.home.starters.length + detail.lineups.away.starters.length}
          </span>
        </div>

        {hasLineups ? (
          <div className={styles.analysisGrid}>
            {[
              {
                key: "home",
                team: fixture.homeTeam.name,
                lineup: detail.lineups.home,
                markerClass: styles.homeMarker,
              },
              {
                key: "away",
                team: fixture.awayTeam.name,
                lineup: detail.lineups.away,
                markerClass: styles.awayMarker,
              },
            ].map((entry) => (
              <article key={entry.key} className={styles.detailCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{entry.team}</h3>
                    <p className={styles.muted}>
                      {entry.lineup.formation
                        ? formatDictionaryText(dictionary.formation, {
                            value: entry.lineup.formation,
                          })
                        : dictionary.formationPending}
                    </p>
                  </div>
                  <span className={entry.markerClass}>{getSideLabel(entry.key, dictionary)}</span>
                </div>

                <div className={styles.lineupSection}>
                  <strong>{dictionary.startingXi}</strong>
                  <div className={styles.lineupList}>
                    {entry.lineup.starters.map((player) => (
                      <div key={player.id} className={styles.lineupRow}>
                        <span className={styles.jerseyBadge}>{player.jerseyNumber}</span>
                        <div>
                          <strong>{player.name}</strong>
                          {player.formationField ? (
                            <p className={styles.muted}>
                              {formatDictionaryText(dictionary.slot, {
                                value: player.formationField,
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {entry.lineup.bench.length ? (
                  <div className={styles.lineupSection}>
                    <strong>{dictionary.bench}</strong>
                    <div className={styles.lineupList}>
                      {entry.lineup.bench.map((player) => (
                        <div key={player.id} className={styles.lineupRow}>
                          <span className={styles.jerseyBadge}>{player.jerseyNumber}</span>
                          <strong>{player.name}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.lineupsPending}</div>
        )}
        </section>
      ) : null}

      {activeTab === "match" ? (
        <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.markets}</p>
            <h2 className={styles.sectionTitle}>{dictionary.fixtureOdds}</h2>
            <p className={styles.sectionLead}>{dictionary.fixtureOddsLead}</p>
          </div>
          <div className={styles.inlineBadgeRow}>
            <span className={coverageTone(odds.state)}>{odds.stateLabel}</span>
            <span className={styles.badge}>{odds.summary.marketCount}</span>
          </div>
        </div>

        <ModuleEngagementTracker
          moduleType="fixture_odds"
          entityType="fixture"
          entityId={fixture.id}
          surface="match-detail"
          metadata={{ viewerTerritory }}
        >
          {shouldGateOdds ? (
            <RegulatedContentGate
              storageKey={`sports:age-gate:fixture:${fixture.id}:odds`}
              title={odds.legal.gateTitle}
              body={odds.legal.gateBody}
              confirmLabel={odds.legal.gateConfirmLabel}
              legalLines={odds.legal.legalLines}
            >
              {oddsContent}
            </RegulatedContentGate>
          ) : (
            oddsContent
          )}
        </ModuleEngagementTracker>
        </section>
      ) : null}

      {activeTab === "h2h" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.matchHeadToHead}</p>
              <h2 className={styles.sectionTitle}>{dictionary.matchHeadToHead}</h2>
              <p className={styles.sectionLead}>{dictionary.matchHeadToHeadLead}</p>
            </div>
            <span className={styles.badge}>{headToHead?.totalCompleted || 0}</span>
          </div>

          <div className={styles.coverageGrid}>
            <div className={styles.coverageItem}>
              <span>{fixture.homeTeam.name}</span>
              <strong>{headToHead?.homeWins || 0}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{fixture.awayTeam.name}</span>
              <strong>{headToHead?.awayWins || 0}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{dictionary.tableDrawn}</span>
              <strong>{headToHead?.draws || 0}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{dictionary.matchHeadToHeadStored}</span>
              <strong>
                {headToHead?.latestSnapshotAt
                  ? formatSnapshotTime(headToHead.latestSnapshotAt, locale)
                  : dictionary.noData}
              </strong>
            </div>
          </div>

          {headToHead?.completedMatches?.length ? (
            <div className={styles.fixtureGrid}>
              {headToHead.completedMatches.map((historyFixture) => (
                <FixtureCard
                  key={historyFixture.id}
                  fixture={historyFixture}
                  locale={locale}
                  showAlerts
                  alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                  surface="match-detail"
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.matchHeadToHeadEmpty}</div>
          )}

          {headToHead?.upcomingMatches?.length ? (
            <div className={styles.surfaceStack}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{dictionary.fixtures}</p>
                  <h3 className={styles.cardTitle}>{dictionary.matchHeadToHeadNext}</h3>
                </div>
                <span className={styles.badge}>{headToHead.upcomingMatches.length}</span>
              </div>
              <div className={styles.fixtureGrid}>
                {headToHead.upcomingMatches.map((historyFixture) => (
                  <FixtureCard
                    key={historyFixture.id}
                    fixture={historyFixture}
                    locale={locale}
                    showAlerts
                    alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                    surface="match-detail"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "standings" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.standings}</p>
              <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
            </div>
            <span className={styles.badge}>{standingRows.length}</span>
          </div>

          <div className={styles.filterRow}>
            {standingViews.map((view) => (
              <Link
                key={view}
                href={buildMatchPageHref(locale, fixtureReference, {
                  tab: "standings",
                  standing: view,
                  territory: filters?.territory,
                })}
                className={
                  view === matchCentre?.standingsTable?.selectedView ? styles.filterChipActive : styles.filterChip
                }
              >
                {getStandingViewLabel(view, dictionary)}
              </Link>
            ))}
          </div>

          {focusRows.length ? (
            <div className={styles.coverageGrid}>
              {focusRows.map((row) => (
                <div key={row.team.id} className={styles.coverageItem}>
                  <span>{row.team.name}</span>
                  <strong>
                    {row.position}. {row.points} {dictionary.tablePoints}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}

          <StandingsTable
            rows={standingRows}
            dictionary={dictionary}
            locale={locale}
            highlightTeamIds={[fixture.homeTeam.id, fixture.awayTeam.id]}
          />
        </section>
      ) : null}

      {activeTab === "video" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.matchVideo}</p>
              <h2 className={styles.sectionTitle}>{dictionary.watchOptions}</h2>
              <p className={styles.sectionLead}>{dictionary.matchVideoLead}</p>
            </div>
            <span className={styles.badge}>{broadcast.summary.channelCount}</span>
          </div>

          <div className={styles.coverageGrid}>
            <div className={styles.coverageItem}>
              <span>{dictionary.venue}</span>
              <strong>{matchCentre?.venue?.name || fixture.venue || dictionary.noData}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{dictionary.referee}</span>
              <strong>{matchCentre?.referee?.name || dictionary.noData}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{dictionary.broadcastStreaming}</span>
              <strong>{broadcast.summary.streamingCount}</strong>
            </div>
            <div className={styles.coverageItem}>
              <span>{dictionary.broadcastTelevision}</span>
              <strong>{broadcast.summary.televisionCount}</strong>
            </div>
          </div>

          {topOdds.length ? (
            <div className={styles.surfaceStack}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{dictionary.fixtureOdds}</p>
                  <h3 className={styles.cardTitle}>{dictionary.matchTopPrices}</h3>
                </div>
                <span className={styles.badge}>{topOdds.length}</span>
              </div>
              <div className={styles.eventGrid}>
                {topOdds.map((entry) => (
                  <article key={entry.key} className={styles.panel}>
                    <div className={styles.cardHeader}>
                      <strong>{entry.bookmaker || dictionary.fixtureOdds}</strong>
                      {entry.marketType ? <span className={styles.badge}>{entry.marketType}</span> : null}
                    </div>
                    <h3 className={styles.cardTitle}>{entry.selectionLabel || entry.fixtureLabel}</h3>
                    {entry.fixtureLabel ? <p className={styles.muted}>{entry.fixtureLabel}</p> : null}
                    <div className={styles.insightSplit}>
                      <span className={styles.insightMetric}>{dictionary.bestPrice}</span>
                      <strong className={styles.insightPrice}>{entry.priceLabel || "-"}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "video" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.broadcastGuide}</p>
            <h2 className={styles.sectionTitle}>{dictionary.broadcastGuide}</h2>
            <p className={styles.sectionLead}>{dictionary.broadcastLead}</p>
          </div>
          <div className={styles.inlineBadgeRow}>
            <span className={coverageTone(broadcast.state)}>{broadcast.stateLabel}</span>
            <span className={styles.badge}>{broadcast.summary.channelCount}</span>
          </div>
        </div>

        <ModuleEngagementTracker
          moduleType="fixture_broadcast"
          entityType="fixture"
          entityId={fixture.id}
          surface="match-detail"
          metadata={{ viewerTerritory }}
        >
          <div className={styles.surfaceStack}>
            <div className={styles.surfaceSummary}>
              <span className={styles.badge}>
                {dictionary.broadcastTelevision}: {broadcast.summary.televisionCount}
              </span>
              <span className={styles.badge}>
                {dictionary.broadcastStreaming}: {broadcast.summary.streamingCount}
              </span>
              <span className={styles.badge}>{viewerTerritory}</span>
              {broadcast.lastUpdatedAt ? (
                <span className={styles.badge}>
                  {formatDictionaryText(dictionary.oddsLastUpdated, {
                    time: formatSnapshotTime(broadcast.lastUpdatedAt, locale),
                  })}
                </span>
              ) : null}
            </div>

            {broadcast.message ? <div className={styles.infoBanner}>{broadcast.message}</div> : null}

            {broadcast.channels.length ? (
              <div className={styles.channelGrid}>
                {broadcast.channels.map((channel) => (
                  <article key={channel.id} className={styles.channelCard}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{channel.name}</h3>
                        <p className={styles.muted}>{channel.channelTypeLabel}</p>
                      </div>
                      {channel.territory ? <span className={styles.badge}>{channel.territory}</span> : null}
                    </div>

                    {channel.territories.length > 1 ? (
                      <p className={styles.muted}>
                        {formatDictionaryText(dictionary.broadcastAvailableIn, {
                          territories: channel.territories.join(", "),
                        })}
                      </p>
                    ) : null}

                    {channel.url ? (
                      <TrackedActionLink
                        href={channel.url}
                        external
                        className={styles.channelLink}
                        analyticsEvent="broadcast_channel_click"
                        analyticsSurface="match-detail"
                        analyticsEntityType="fixture"
                        analyticsEntityId={fixture.id}
                        analyticsAction={`channel:${channel.name}`}
                        analyticsMetadata={{
                          channelType: channel.channelType,
                          territory: channel.territory,
                        }}
                      >
                        {dictionary.openChannel}
                      </TrackedActionLink>
                    ) : (
                      <span className={styles.badge}>{dictionary.channelListingOnly}</span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{broadcast.message || dictionary.broadcastUnavailable}</div>
            )}

            {broadcast.restrictedTerritories.length ? (
              <div className={styles.territoryList}>
                {broadcast.restrictedTerritories.map((territory) => (
                  <span key={territory} className={styles.legalChip}>
                    {territory}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </ModuleEngagementTracker>
        </section>
      ) : null}
    </section>
  );
}
