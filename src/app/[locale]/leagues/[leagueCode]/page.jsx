import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AlertSubscriptionControl } from "../../../../components/coreui/alert-subscription-control";
import { CompetitionOddsTabs } from "../../../../components/coreui/competition-odds-tabs";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { ModuleEngagementTracker } from "../../../../components/coreui/module-engagement-tracker";
import { NewsModule } from "../../../../components/coreui/news-module";
import { OddsPredictionWidgets } from "../../../../components/coreui/odds-prediction-widgets";
import { RecentViewTracker } from "../../../../components/coreui/recent-view-tracker";
import { RegulatedContentGate } from "../../../../components/coreui/regulated-content-gate";
import { StructuredData } from "../../../../components/coreui/structured-data";
import styles from "../../../../components/coreui/styles.module.css";
import {
  formatDictionaryText,
  getDictionary,
  getStandingViewLabel,
} from "../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import { getNewsModuleExperience } from "../../../../lib/coreui/news-experience";
import {
  buildBreadcrumbStructuredData,
  buildCollectionPageStructuredData,
  buildPageMetadata,
  buildSportsOrganizationStructuredData,
} from "../../../../lib/coreui/metadata";
import { getCompetitionNewsModule } from "../../../../lib/coreui/news-read";
import { resolveViewerTerritory } from "../../../../lib/coreui/odds-broadcast";
import { getLeagueDetail } from "../../../../lib/coreui/read";
import {
  getPersonalizationSnapshot,
  sortFixturesByPersonalization,
  sortTeamsByPersonalization,
} from "../../../../lib/personalization";
import {
  buildCountryHref,
  buildSportHref,
  buildTeamHref,
} from "../../../../lib/coreui/routes";

const VALID_TABS = ["summary", "odds", "news", "results", "fixtures", "standings", "archive"];

function normalizeTab(value) {
  if (!value) {
    return "summary";
  }

  return VALID_TABS.includes(value) ? value : "summary";
}

function buildLeagueHref(locale, leagueCode, { tab, season, standing, territory } = {}) {
  const params = new URLSearchParams();

  if (tab && tab !== "summary") {
    params.set("tab", tab);
  }

  if (season) {
    params.set("season", season);
  }

  if (standing && standing !== "overall") {
    params.set("standing", standing);
  }

  if (territory) {
    params.set("territory", territory);
  }

  const query = params.toString();
  return `/${locale}/leagues/${leagueCode}${query ? `?${query}` : ""}`;
}

function surfaceTone(state) {
  if (state === "available") {
    return styles.surfaceStateAvailable;
  }

  if (state === "stale") {
    return styles.surfaceStateStale;
  }

  if (state === "region_restricted") {
    return styles.surfaceStateRestricted;
  }

  return styles.surfaceStateUnavailable;
}

function formTone(result) {
  if (result === "W") {
    return styles.formBadgeWin;
  }

  if (result === "L") {
    return styles.formBadgeLoss;
  }

  return styles.formBadgeDraw;
}

function renderStandingsTable(rows, dictionary, locale) {
  if (!rows.length) {
    return <div className={styles.emptyState}>{dictionary.noData}</div>;
  }

  return (
    <div className={styles.standingsTableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{dictionary.tablePosition}</th>
            <th>{dictionary.tableTeam}</th>
            <th>{dictionary.tablePlayed}</th>
            <th>{dictionary.tableWon}</th>
            <th>{dictionary.tableDrawn}</th>
            <th>{dictionary.tableLost}</th>
            <th>{dictionary.tableGoalsFor}</th>
            <th>{dictionary.tableGoalsAgainst}</th>
            <th>{dictionary.tableGoalDifference}</th>
            <th>{dictionary.tablePoints}</th>
            <th>{dictionary.tableForm}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team.id}>
              <td>{row.position}</td>
              <td>
                <Link href={buildTeamHref(locale, row.team)}>{row.team.name}</Link>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.goalDifference}</td>
              <td>{row.points}</td>
              <td>
                <div className={styles.formStrip}>
                  {row.form.length ? (
                    row.form.map((result, index) => (
                      <span
                        key={`${row.team.id}-${result}-${index}`}
                        className={`${styles.formBadge} ${formTone(result)}`}
                      >
                        {result}
                      </span>
                    ))
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { locale, leagueCode } = await params;
  const league = await getLeagueDetail(leagueCode);
  const dictionary = getDictionary(locale);

  if (!league) {
    return buildPageMetadata(
      locale,
      dictionary.metaLeagueFallbackTitle,
      dictionary.metaLeagueFallbackDescription,
      `/leagues/${leagueCode}`
    );
  }

  return buildPageMetadata(
    locale,
    league.name,
    formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name }),
    `/leagues/${leagueCode}`,
    {
      keywords: [
        league.name,
        league.country,
        league.sport?.name || league.competition?.sport?.name,
        dictionary.standings,
      ].filter(Boolean),
    }
  );
}

export default async function LeagueDetailPage({ params, searchParams }) {
  const { locale, leagueCode } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const activeTab = normalizeTab(filters?.tab);
  const selectedStandingView = filters?.standing || "overall";
  const viewerTerritory = resolveViewerTerritory({
    territory: filters?.territory,
    headers: await headers(),
  });
  const [league, flags, personalization] = await Promise.all([
    getLeagueDetail(leagueCode, {
      locale,
      viewerTerritory,
      seasonRef: filters?.season,
      standingsView: selectedStandingView,
    }),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);

  if (!league) {
    notFound();
  }

  const competitionNews = flags.leagueNews
    ? await getCompetitionNewsModule(league.competitionId, activeTab === "news" ? 8 : 4)
    : { articles: [], total: 0 };
  const competitionNewsExperience = flags.leagueNews
    ? await getNewsModuleExperience({
        locale,
        viewerTerritory,
        articles: competitionNews.articles,
        entityContext: {
          competition: league,
          entityType: "league",
          entityId: league.id,
        },
      })
    : { promo: null };
  const sport = league.sport || league.competition?.sport || null;
  const country = league.countryRecord || league.competition?.country || null;
  const countryHref = sport && country ? buildCountryHref(locale, country, sport) : null;
  const sportHref = sport ? buildSportHref(locale, sport) : null;
  const selectedSeasonRef =
    league.selectedSeason?.externalRef || league.selectedSeason?.id || league.selectedSeason?.name;
  const oddsSurface = league.competitionOdds;
  const shouldGateOdds = oddsSurface.enabled && oddsSurface.tabs.length > 0;
  const prioritizedTeams = sortTeamsByPersonalization(
    league.teams,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const prioritizedUpcomingFixtures = sortFixturesByPersonalization(
    league.upcomingFixtures,
    personalization,
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );
  const prioritizedRecentResults = sortFixturesByPersonalization(
    league.recentResults,
    personalization,
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
  );
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      ...(sportHref ? [{ name: sport?.name, path: sportHref }] : []),
      ...(countryHref ? [{ name: country?.name, path: countryHref }] : []),
      { name: league.name, path: `/${locale}/leagues/${league.code}` },
    ]),
    buildSportsOrganizationStructuredData({
      path: `/${locale}/leagues/${league.code}`,
      name: league.name,
      sport: sport?.name,
      country: league.country,
      description: formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name }),
    }),
    buildCollectionPageStructuredData({
      path: `/${locale}/leagues/${league.code}`,
      name: league.name,
      description: formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name }),
      items: prioritizedTeams.slice(0, 10).map((team) => ({
        name: team.name,
        path: buildTeamHref(locale, team),
      })),
    }),
  ];

  const oddsContent = (
    <div className={styles.surfaceStack}>
      <div className={styles.surfaceSummary}>
        <span className={styles.badge}>
          {formatDictionaryText(dictionary.oddsSummaryFixtures, {
            count: oddsSurface.summary.fixtureCount,
          })}
        </span>
        <span className={styles.badge}>
          {dictionary.oddsSourcesLabel}: {oddsSurface.summary.bookmakerCount}
        </span>
        <span className={styles.badge}>{viewerTerritory}</span>
      </div>

      {oddsSurface.message ? <div className={styles.infoBanner}>{oddsSurface.message}</div> : null}

      {oddsSurface.bookmakers?.length ? (
        <div className={styles.inlineBadgeRow}>
          {oddsSurface.bookmakers.slice(0, 6).map((bookmaker) => (
            <span key={bookmaker.key} className={styles.legalChip}>
              {bookmaker.shortName || bookmaker.name}
            </span>
          ))}
        </div>
      ) : null}

      {oddsSurface.tabs.length ? (
        <CompetitionOddsTabs tabs={oddsSurface.tabs} locale={locale} />
      ) : (
        <div className={styles.emptyState}>{oddsSurface.message || dictionary.oddsUnavailable}</div>
      )}

      <div className={styles.legalStack}>
        {oddsSurface.legal.legalLines.map((line) => (
          <span key={line} className={styles.legalChip}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
  const hasCompetitionInsights = Boolean(
    oddsSurface.insights?.topPicks?.length ||
      oddsSurface.insights?.valueBets?.length ||
      oddsSurface.insights?.bestOdds?.length ||
      oddsSurface.insights?.highOddsMatches?.length ||
      oddsSurface.ctaConfig?.primaryAffiliate?.href ||
      oddsSurface.ctaConfig?.funnelActions?.length
  );

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

      <RecentViewTracker
        itemId={`competition:${league.code}`}
        label={league.name}
        metadata={{
          sport: sport?.name || null,
          country: league.country || null,
        }}
      />

      <header className={styles.pageHeader}>
        <div>
          <div className={styles.linkList}>
            {sportHref ? (
              <Link href={sportHref} className={styles.badge}>
                {sport?.name}
              </Link>
            ) : null}
            {countryHref ? (
              <Link href={countryHref} className={styles.badge}>
                {country?.name}
              </Link>
            ) : (
              <span className={styles.badge}>{league.country || dictionary.international}</span>
            )}
            {league.selectedSeason ? <span className={styles.badge}>{league.selectedSeason.name}</span> : null}
          </div>
          <h1 className={styles.pageTitle}>{league.name}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name })}
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{league.teams.length}</span>
          <FavoriteToggle
            itemId={`competition:${league.code}`}
            locale={locale}
            label={league.name}
            metadata={{
              country: league.country || null,
            }}
            surface="league-detail"
          />
          <AlertSubscriptionControl
            itemId={`competition:${league.code}`}
            locale={locale}
            supportedTypes={["KICKOFF", "FINAL_RESULT"]}
            label={league.name}
            metadata={{
              country: league.country || null,
            }}
            surface="league-detail"
          />
          <Link
            href={buildLeagueHref(locale, league.code, {
              tab: "standings",
              season: selectedSeasonRef,
              standing: league.standingsTable.selectedView,
              territory: filters?.territory,
            })}
            className={styles.actionLink}
          >
            {dictionary.standings}
          </Link>
        </div>
      </header>

      <div className={styles.filterStack}>
        <div className={styles.filterRow}>
          {[
            { key: "summary", label: dictionary.overview },
            { key: "odds", label: dictionary.competitionOdds },
            { key: "news", label: dictionary.news },
            { key: "results", label: dictionary.results },
            { key: "fixtures", label: dictionary.fixtures },
            { key: "standings", label: dictionary.standings },
            { key: "archive", label: dictionary.archive },
          ].map((item) => (
            <Link
              key={item.key}
              href={buildLeagueHref(locale, league.code, {
                tab: item.key,
                season: selectedSeasonRef,
                standing: league.standingsTable.selectedView,
                territory: filters?.territory,
              })}
              className={item.key === activeTab ? styles.filterChipActive : styles.filterChip}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {league.seasons.length ? (
          <div className={styles.filterRow}>
            {league.seasons.map((season) => {
              const seasonReference = season.externalRef || season.id || season.name;
              const isActive = seasonReference === selectedSeasonRef;

              return (
                <Link
                  key={season.id}
                  href={buildLeagueHref(locale, league.code, {
                    tab: activeTab,
                    season: seasonReference,
                    standing: league.standingsTable.selectedView,
                    territory: filters?.territory,
                  })}
                  className={isActive ? styles.filterChipActive : styles.filterChip}
                >
                  {season.name}
                  {season.isCurrent ? (
                    <span className={styles.filterCount}>{dictionary.currentSeason}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeTab === "summary" ? (
        <>
          <div className={styles.detailGrid}>
            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
                <span className={styles.badge}>
                  {getStandingViewLabel(league.standingsTable.selectedView, dictionary)}
                </span>
              </div>
              {renderStandingsTable(league.standingsTable.rows.slice(0, 8), dictionary, locale)}
            </article>

            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{dictionary.teams}</h2>
                <span className={styles.badge}>{league.teams.length}</span>
              </div>
              {prioritizedTeams.length ? (
                <div className={styles.teamGrid}>
                  {prioritizedTeams.map((team) => (
                    <article key={team.id} className={styles.teamCard}>
                      <div className={styles.cardHeader}>
                        <div>
                          <p className={styles.cardTitle}>
                            <Link href={buildTeamHref(locale, team)}>{team.name}</Link>
                          </p>
                          <p className={styles.muted}>{team.shortName || team.code || league.name}</p>
                        </div>
                        <FavoriteToggle
                          itemId={`team:${team.id}`}
                          locale={locale}
                          compact
                          label={team.name}
                          metadata={{
                            leagueCode: league.code,
                          }}
                          surface="league-detail"
                        />
                      </div>
                      <Link href={buildTeamHref(locale, team)} className={styles.sectionAction}>
                        {dictionary.teamProfile}
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>{dictionary.noData}</div>
              )}
            </article>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.overview}</p>
                <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
              </div>
              <Link
                href={buildLeagueHref(locale, league.code, {
                  tab: "fixtures",
                  season: selectedSeasonRef,
                  territory: filters?.territory,
                })}
                className={styles.sectionAction}
              >
                {dictionary.browseAll}
              </Link>
            </div>
            {prioritizedUpcomingFixtures.length ? (
              <div className={styles.fixtureGrid}>
                {prioritizedUpcomingFixtures.slice(0, 6).map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{dictionary.noData}</div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.recent}</p>
                <h2 className={styles.sectionTitle}>{dictionary.results}</h2>
              </div>
              <Link
                href={buildLeagueHref(locale, league.code, {
                  tab: "results",
                  season: selectedSeasonRef,
                  territory: filters?.territory,
                })}
                className={styles.sectionAction}
              >
                {dictionary.browseAll}
              </Link>
            </div>
            {prioritizedRecentResults.length ? (
              <div className={styles.fixtureGrid}>
                {prioritizedRecentResults.slice(0, 6).map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{dictionary.noData}</div>
            )}
          </section>

          {flags.leagueNews ? (
            <NewsModule
              locale={locale}
              dictionary={dictionary}
              eyebrow={dictionary.news}
              title={dictionary.newsCompetitionModuleTitle}
              lead={dictionary.newsCompetitionModuleLead}
              articles={competitionNews.articles}
              href="/news"
              actionLabel={dictionary.browseAll}
              emptyLabel={dictionary.newsEmpty}
              trackingSurface="league-news-module"
              promo={competitionNewsExperience.promo}
            />
          ) : null}
        </>
      ) : null}

      {activeTab === "odds" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.markets}</p>
              <h2 className={styles.sectionTitle}>{dictionary.competitionOdds}</h2>
              <p className={styles.sectionLead}>{dictionary.competitionOddsLead}</p>
            </div>
            <div className={styles.inlineBadgeRow}>
              <span className={surfaceTone(oddsSurface.state)}>{oddsSurface.stateLabel}</span>
              <span className={styles.badge}>{oddsSurface.summary.fixtureCount}</span>
            </div>
          </div>

          {hasCompetitionInsights ? (
            <div className={styles.surfaceStack}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{dictionary.competitionInsights}</p>
                  <h3 className={styles.cardTitle}>{dictionary.competitionInsights}</h3>
                  <p className={styles.sectionLead}>{dictionary.competitionInsightsLead}</p>
                </div>
                {oddsSurface.bookmakers?.length ? (
                  <span className={styles.badge}>{oddsSurface.bookmakers.length}</span>
                ) : null}
              </div>

              <OddsPredictionWidgets
                locale={locale}
                dictionary={dictionary}
                surface="league-detail"
                entityType="league"
                entityId={league.id}
                insights={oddsSurface.insights}
                ctaConfig={oddsSurface.ctaConfig}
              />
            </div>
          ) : null}

          <ModuleEngagementTracker
            moduleType="competition_odds"
            entityType="league"
            entityId={league.id}
            surface="league-detail"
            metadata={{
              leagueCode: league.code,
              viewerTerritory,
            }}
          >
            {shouldGateOdds ? (
              <RegulatedContentGate
                storageKey={`sports:age-gate:league:${league.id}:odds`}
                title={oddsSurface.legal.gateTitle}
                body={oddsSurface.legal.gateBody}
                confirmLabel={oddsSurface.legal.gateConfirmLabel}
                legalLines={oddsSurface.legal.legalLines}
              >
                {oddsContent}
              </RegulatedContentGate>
            ) : (
              oddsContent
            )}
          </ModuleEngagementTracker>
        </section>
      ) : null}

      {activeTab === "news" ? (
        flags.leagueNews ? (
          <NewsModule
            locale={locale}
            dictionary={dictionary}
            eyebrow={dictionary.news}
            title={dictionary.newsCompetitionModuleTitle}
            lead={dictionary.newsCompetitionModuleLead}
            articles={competitionNews.articles}
            href="/news"
            actionLabel={dictionary.browseAll}
            emptyLabel={dictionary.newsEmpty}
            trackingSurface="league-news-tab"
            promo={competitionNewsExperience.promo}
          />
        ) : (
          <div className={styles.emptyState}>{dictionary.newsHubDisabled}</div>
        )
      ) : null}

      {activeTab === "results" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.results}</p>
              <h2 className={styles.sectionTitle}>{dictionary.results}</h2>
            </div>
            <span className={styles.badge}>{prioritizedRecentResults.length}</span>
          </div>
          {prioritizedRecentResults.length ? (
            <div className={styles.fixtureGrid}>
              {prioritizedRecentResults.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}

      {activeTab === "fixtures" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.fixtures}</p>
              <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
            </div>
            <span className={styles.badge}>{prioritizedUpcomingFixtures.length}</span>
          </div>
          {prioritizedUpcomingFixtures.length ? (
            <div className={styles.fixtureGrid}>
              {prioritizedUpcomingFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}

      {activeTab === "standings" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.standings}</p>
              <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
            </div>
            <span className={styles.badge}>{league.standingsTable.rows.length}</span>
          </div>

          <div className={styles.filterRow}>
            {league.standingsTable.availableViews.map((view) => (
              <Link
                key={view}
                href={buildLeagueHref(locale, league.code, {
                  tab: "standings",
                  season: selectedSeasonRef,
                  standing: view,
                  territory: filters?.territory,
                })}
                className={
                  view === league.standingsTable.selectedView ? styles.filterChipActive : styles.filterChip
                }
              >
                {getStandingViewLabel(view, dictionary)}
              </Link>
            ))}
          </div>

          {renderStandingsTable(league.standingsTable.rows, dictionary, locale)}
        </section>
      ) : null}

      {activeTab === "archive" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.archive}</p>
              <h2 className={styles.sectionTitle}>{dictionary.archive}</h2>
            </div>
            <span className={styles.badge}>{league.archiveSeasons.length}</span>
          </div>

          {league.archiveSeasons.length ? (
            <div className={styles.leagueGrid}>
              {league.archiveSeasons.map((season) => {
                const seasonReference = season.externalRef || season.id || season.name;

                return (
                  <article key={season.id} className={styles.leagueCard}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{season.name}</h3>
                        <p className={styles.muted}>
                          {new Date(season.startDate).getFullYear()} - {new Date(season.endDate).getFullYear()}
                        </p>
                      </div>
                      {season.isCurrent ? <span className={styles.liveBadge}>{dictionary.currentSeason}</span> : null}
                    </div>

                    <div className={styles.inlineBadgeRow}>
                      <span className={styles.badge}>{dictionary.fixtures}: {season.fixtureCount}</span>
                      <span className={styles.badge}>{dictionary.standings}: {season.standingCount}</span>
                    </div>

                    <div className={styles.fixtureActionRow}>
                      <Link
                        href={buildLeagueHref(locale, league.code, {
                          tab: "summary",
                          season: seasonReference,
                          territory: filters?.territory,
                        })}
                        className={styles.sectionAction}
                      >
                        {dictionary.overview}
                      </Link>
                      <Link
                        href={buildLeagueHref(locale, league.code, {
                          tab: "standings",
                          season: seasonReference,
                          standing: "overall",
                          territory: filters?.territory,
                        })}
                        className={styles.actionLink}
                      >
                        {dictionary.standings}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}
    </section>
  );
}
