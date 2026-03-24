import Link from "next/link";
import { headers } from "next/headers";
import { buildPageMetadata } from "../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../lib/coreui/feature-flags";
import { getNewsModuleExperience } from "../../lib/coreui/news-experience";
import { getHomepageNewsModule } from "../../lib/coreui/news-read";
import { getHomeSnapshot } from "../../lib/coreui/read";
import { getLiveMatchdayFeed } from "../../lib/coreui/live-read";
import { resolveViewerTerritory } from "../../lib/coreui/odds-broadcast";
import { FixtureFeedCard } from "../../components/coreui/fixture-feed-card";
import { FavoriteToggle } from "../../components/coreui/favorite-toggle";
import { LiveBoardGroupList } from "../../components/coreui/live-board-group-list";
import { LiveBoardMonetization } from "../../components/coreui/live-board-monetization";
import { LiveRefresh } from "../../components/coreui/live-refresh";
import { NewsModule } from "../../components/coreui/news-module";
import { CommunitySlipHub } from "../../components/coreui/community-slip-hub";
import { OnboardingPanel } from "../../components/coreui/onboarding-panel";
import { PersonalizationUsageTracker } from "../../components/coreui/personalization-usage-tracker";
import {
  FavoriteChannelPanel,
  FavoriteReminderPanel,
  RecentItemsPanel,
  TopCompetitionsPanel,
} from "../../components/coreui/discovery-panels";
import { StructuredData } from "../../components/coreui/structured-data";
import styles from "../../components/coreui/styles.module.css";
import {
  buildFavoriteChannelPanelModel,
  buildFavoriteReminderItems,
} from "../../lib/favorite-retention";
import {
  getFavoritesPageData,
  getPersonalizationSnapshot,
  getPersonalizationUsage,
  sortCompetitionsByPersonalization,
  sortFixturesByPersonalization,
} from "../../lib/personalization";
import {
  getOnboardingDiscoveryOptions,
  getRecentItemsModule,
  getTopCompetitionsModule,
} from "../../lib/coreui/discovery";
import { getPreferenceSnapshot } from "../../lib/coreui/preferences-server";
import { getPlatformPublicSnapshotData } from "../../lib/platform/env";
import { getProfileComplianceSnapshot } from "../../lib/profile-preferences";
import { getCurrentUserFromServer } from "../../lib/auth";
import { getCommunitySlipHubData } from "../../lib/community-slips";
import {
  buildWebsiteSearchStructuredData,
  buildWebPageStructuredData,
} from "../../lib/coreui/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.metaHomeTitle, dictionary.metaHomeDescription, "");
}

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const viewerTerritory = resolveViewerTerritory({
    headers: await headers(),
  });
  const [snapshot, homeBoardFeed, homeNews, flags, personalization, userContext] = await Promise.all([
    getHomeSnapshot(),
    getLiveMatchdayFeed({
      locale,
      viewerTerritory,
    }),
    getHomepageNewsModule(),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
    getCurrentUserFromServer(),
  ]);
  const communitySlipHub = await getCommunitySlipHubData({
    locale,
    viewerTerritory,
    currentUserId: userContext?.user?.id || null,
  });
  const usage = getPersonalizationUsage(personalization);
  const [
    topCompetitionsRaw,
    recentItems,
    favoritePageData,
    preferenceSnapshot,
    platform,
    onboardingOptions,
  ] = await Promise.all([
    getTopCompetitionsModule(),
    getRecentItemsModule(personalization, { locale }),
    usage.hasFavorites ? getFavoritesPageData(personalization) : Promise.resolve(null),
    getPreferenceSnapshot(),
    getPlatformPublicSnapshotData(),
    getOnboardingDiscoveryOptions(),
  ]);
  const topCompetitions = sortCompetitionsByPersonalization(
    topCompetitionsRaw,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const prioritizedLeagues = sortCompetitionsByPersonalization(
    snapshot.leagues,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const prioritizedRecentResults = sortFixturesByPersonalization(
    snapshot.recentResults,
    personalization,
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
  );
  const boardDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).format(new Date(homeBoardFeed.selectedDate));
  const preferenceCompliance = getProfileComplianceSnapshot(preferenceSnapshot, {
    viewerGeo: viewerTerritory,
  });
  const reminderItems = favoritePageData
    ? buildFavoriteReminderItems({
        favorites: favoritePageData,
        locale,
        dictionary,
        alertSettings: personalization.alertSettings,
        limit: 3,
        surface: "home-reminders",
      })
    : [];
  const favoriteChannelPanel = favoritePageData
    ? buildFavoriteChannelPanelModel({
        favorites: favoritePageData,
        locale,
        dictionary,
        platform,
        geo: preferenceCompliance.ctaGeo || preferenceCompliance.effectiveGeo || viewerTerritory,
      })
    : { actions: [], items: [], geoLabel: null };
  const homeNewsExperience = flags.homeNews
    ? await getNewsModuleExperience({
        locale,
        viewerTerritory,
        articles: homeNews.articles,
      })
    : { promo: null };
  const structuredData = [
    buildWebsiteSearchStructuredData({
      locale,
      description: dictionary.searchPageLead,
    }),
    buildWebPageStructuredData({
      path: `/${locale}`,
      name: dictionary.metaHomeTitle,
      description: dictionary.metaHomeDescription,
      inLanguage: locale,
      about: topCompetitions.slice(0, 6).map((competition) => ({
        type: "SportsOrganization",
        name: competition.name,
        path: `/${locale}/leagues/${competition.code}`,
      })),
    }),
  ];

  return (
    <>
      <StructuredData data={structuredData} />

      <PersonalizationUsageTracker
        active={usage.hasFavorites || usage.hasRecentViews}
        surface="home-board"
        metadata={usage}
      />

      <LiveRefresh
        enabled={homeBoardFeed.refresh.enabled}
        intervalMs={homeBoardFeed.refresh.intervalMs}
        until={homeBoardFeed.refresh.until}
      />

      <OnboardingPanel
        locale={locale}
        dictionary={dictionary}
        sportOptions={onboardingOptions.sports}
        competitionOptions={onboardingOptions.competitions}
        teamOptions={onboardingOptions.teams}
        geoOptions={onboardingOptions.geoOptions}
      />

      <section className={styles.noticeBanner}>
        <span className={styles.noticeLabel}>{dictionary.football}</span>
        <p>
          {formatDictionaryText(dictionary.homeNotice, {
            count: homeBoardFeed.fixtures.length,
          })}
        </p>
      </section>

      <CommunitySlipHub
        locale={locale}
        dictionary={dictionary}
        surface="home-community-slips"
        entityType="home"
        entityId={locale}
        viewerTerritory={viewerTerritory}
        initialData={communitySlipHub}
        authHref={`/${locale}/auth`}
        predictionsHref={`/${locale}/predictions`}
      />

      <section className={styles.homeBoard}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.scores}</p>
            <h1 className={styles.pageTitle}>{dictionary.homeScoresTitle}</h1>
            <p className={styles.pageLead}>
              {formatDictionaryText(dictionary.homeScoresLead, {
                live: homeBoardFeed.summary.LIVE,
                scheduled: homeBoardFeed.summary.SCHEDULED,
                finished: homeBoardFeed.summary.FINISHED,
              })}
            </p>
          </div>
          <div className={styles.sectionTools}>
            <span className={styles.badge}>{boardDate}</span>
            <Link href={`/${locale}/live`} className={styles.sectionAction}>
              {dictionary.openLiveBoard}
            </Link>
          </div>
        </header>

        <div className={styles.filterStack}>
          <div className={styles.filterRow}>
            <Link href={`/${locale}`} className={styles.filterChipActive}>
              {dictionary.browseAll}
              <span className={styles.filterCount}>{homeBoardFeed.fixtures.length}</span>
            </Link>
            <Link href={`/${locale}/live`} className={styles.filterChip}>
              {dictionary.liveNow}
              <span className={styles.filterCount}>{homeBoardFeed.summary.LIVE}</span>
            </Link>
            <Link href={`/${locale}/fixtures`} className={styles.filterChip}>
              {dictionary.upcoming}
              <span className={styles.filterCount}>{homeBoardFeed.summary.SCHEDULED}</span>
            </Link>
            <Link href={`/${locale}/results`} className={styles.filterChip}>
              {dictionary.recent}
              <span className={styles.filterCount}>{homeBoardFeed.summary.FINISHED}</span>
            </Link>
            <Link href={`/${locale}/tables`} className={styles.filterChip}>
              {dictionary.standings}
              <span className={styles.filterCount}>{snapshot.leagues.length}</span>
            </Link>
          </div>
        </div>

        <LiveBoardMonetization
          locale={locale}
          dictionary={dictionary}
          monetization={homeBoardFeed.monetization}
          surface="home-board"
        />

        <LiveBoardGroupList
          locale={locale}
          dictionary={dictionary}
          groups={homeBoardFeed.groups}
          monetization={homeBoardFeed.monetization}
          surface="home-board"
          emptyLabel={dictionary.noData}
        />
      </section>

      <div className={styles.homeSplit}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
            <Link href={`/${locale}/tables`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>

          <div className={styles.compactList}>
            {prioritizedLeagues.map((league) => (
              <article key={league.id} className={styles.miniPanel}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
                    <h3 className={styles.cardTitle}>
                      <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                    </h3>
                  </div>
                  <FavoriteToggle
                    itemId={`competition:${league.code}`}
                    locale={locale}
                    compact
                    label={league.name}
                    metadata={{
                      country: league.country || null,
                    }}
                    surface="home-standings"
                  />
                </div>

                <div className={styles.miniTable}>
                  {(league.seasons[0]?.standings || []).slice(0, 4).map((row) => (
                    <div key={row.id} className={styles.miniTableRow}>
                      <span>{row.position}</span>
                      <span>{row.team.name}</span>
                      <strong>{row.points}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.recent}</h2>
            <Link href={`/${locale}/results`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>

          <div className={styles.compactList}>
            {prioritizedRecentResults.slice(0, 4).map((fixture) => (
              <FixtureFeedCard
                key={fixture.id}
                fixture={fixture}
                locale={locale}
                mode="results"
                showLeague
              />
            ))}
          </div>
        </section>
      </div>

      <RecentItemsPanel dictionary={dictionary} items={recentItems} />
      <FavoriteReminderPanel locale={locale} dictionary={dictionary} items={reminderItems} />
      <FavoriteChannelPanel
        locale={locale}
        dictionary={dictionary}
        items={favoriteChannelPanel.items}
        actions={favoriteChannelPanel.actions}
        geoLabel={favoriteChannelPanel.geoLabel}
        surface="home-favorites-channel"
      />
      <TopCompetitionsPanel locale={locale} dictionary={dictionary} competitions={topCompetitions} />

      {flags.homeNews ? (
        <NewsModule
          locale={locale}
          dictionary={dictionary}
          eyebrow={dictionary.news}
          title={dictionary.newsHomeModuleTitle}
          lead={dictionary.newsHomeModuleLead}
          articles={homeNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="home-news-module"
          promo={homeNewsExperience.promo}
        />
      ) : null}
    </>
  );
}
