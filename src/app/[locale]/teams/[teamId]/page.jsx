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
import { StandingsTable } from "../../../../components/coreui/standings-table";
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
  buildPageMetadata,
  buildStandingsStructuredData,
  buildSportsTeamStructuredData,
  buildWebPageStructuredData,
} from "../../../../lib/coreui/metadata";
import { getTeamNewsModule } from "../../../../lib/coreui/news-read";
import { resolveViewerTerritory } from "../../../../lib/coreui/odds-broadcast";
import { getTeamDetail } from "../../../../lib/coreui/read";
import {
  buildCompetitionHref,
  buildCountryHref,
  buildSportHref,
} from "../../../../lib/coreui/routes";

const VALID_TABS = ["summary", "fixtures", "results", "standings", "squad", "competitions", "news", "archive"];

function normalizeTab(value) {
  if (!value) {
    return "summary";
  }

  return VALID_TABS.includes(value) ? value : "summary";
}

function buildTeamPageHref(
  locale,
  teamReference,
  { tab, competition, season, standing, territory } = {}
) {
  const params = new URLSearchParams();

  if (tab && tab !== "summary") {
    params.set("tab", tab);
  }

  if (competition) {
    params.set("competition", competition);
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
  return `/${locale}/teams/${teamReference}${query ? `?${query}` : ""}`;
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

function buildTeamMetadataCopy(dictionary, team, activeTab) {
  const teamName = team?.name || dictionary.metaTeamFallbackTitle;
  const baseDescription = team
    ? formatDictionaryText(dictionary.metaTeamDescription, { name: teamName })
    : dictionary.metaTeamFallbackDescription;

  if (activeTab === "standings") {
    return {
      title: `${teamName} ${dictionary.standings}`,
      description: `${baseDescription} ${dictionary.standings}.`,
    };
  }

  if (activeTab === "fixtures") {
    return {
      title: `${teamName} ${dictionary.fixtures}`,
      description: `${baseDescription} ${dictionary.fixtures}.`,
    };
  }

  if (activeTab === "results") {
    return {
      title: `${teamName} ${dictionary.results}`,
      description: `${baseDescription} ${dictionary.results}.`,
    };
  }

  if (activeTab === "news") {
    return {
      title: `${teamName} ${dictionary.news}`,
      description: `${baseDescription} ${dictionary.news}.`,
    };
  }

  if (activeTab === "competitions") {
    return {
      title: `${teamName} ${dictionary.linkedCompetitions}`,
      description: `${baseDescription} ${dictionary.linkedCompetitions}.`,
    };
  }

  if (activeTab === "archive") {
    return {
      title: `${teamName} ${dictionary.archive}`,
      description: `${baseDescription} ${dictionary.archive}.`,
    };
  }

  return {
    title: teamName,
    description: baseDescription,
  };
}

export async function generateMetadata({ params, searchParams }) {
  const { locale, teamId } = await params;
  const filters = await searchParams;
  const activeTab = normalizeTab(filters?.tab);
  const team = await getTeamDetail(teamId);
  const dictionary = getDictionary(locale);
  const metadataCopy = buildTeamMetadataCopy(dictionary, team, activeTab);

  return buildPageMetadata(
    locale,
    metadataCopy.title,
    metadataCopy.description,
    `/teams/${teamId}`,
    {
      keywords: [
        team?.name,
        team?.selectedCompetition?.name || team?.league?.name,
        team?.sport?.name,
        activeTab === "standings" ? dictionary.standings : null,
        activeTab === "news" ? dictionary.news : null,
      ].filter(Boolean),
      other: {
        "sports-surface": activeTab,
      },
    }
  );
}

export default async function TeamDetailPage({ params, searchParams }) {
  const { locale, teamId } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const activeTab = normalizeTab(filters?.tab);
  const selectedStandingView = filters?.standing || "overall";
  const viewerTerritory = resolveViewerTerritory({
    territory: filters?.territory,
    headers: await headers(),
  });
  const [team, flags] = await Promise.all([
    getTeamDetail(teamId, {
      locale,
      viewerTerritory,
      competitionRef: filters?.competition,
      seasonRef: filters?.season,
      standingsView: selectedStandingView,
      includeExperience: true,
    }),
    getPublicSurfaceFlags(),
  ]);

  if (!team) {
    notFound();
  }

  const selectedCompetitionRef =
    team.selectedCompetition?.code || team.selectedCompetition?.leagueId || team.selectedCompetition?.id;
  const selectedSeasonRef =
    team.selectedSeason?.externalRef || team.selectedSeason?.id || team.selectedSeason?.name;
  const teamNews = flags.teamNews
    ? await getTeamNewsModule(team.id, activeTab === "news" ? 8 : 4)
    : { articles: [], total: 0 };
  const teamNewsExperience = flags.teamNews
    ? await getNewsModuleExperience({
        locale,
        viewerTerritory,
        articles: teamNews.articles,
        entityContext: {
          team,
          competition: team.selectedCompetition || null,
          entityType: "team",
          entityId: team.id,
        },
      })
    : { promo: null };
  const sportHref = team.sport ? buildSportHref(locale, team.sport) : null;
  const countryHref =
    team.selectedCompetition?.countryRecord && team.sport
      ? buildCountryHref(locale, team.selectedCompetition.countryRecord, team.sport)
      : team.country && team.sport && team.league?.countryRecord
        ? buildCountryHref(locale, team.league.countryRecord, team.sport)
        : null;
  const teamOddsSurface = team.competitionOdds;
  const shouldGateOdds = teamOddsSurface?.enabled && teamOddsSurface?.tabs?.length > 0;
  const hasCompetitionInsights = Boolean(
    teamOddsSurface?.insights?.bestBet ||
      teamOddsSurface?.insights?.topPicks?.length ||
      teamOddsSurface?.insights?.valueBets?.length ||
      teamOddsSurface?.insights?.bestOdds?.length ||
      teamOddsSurface?.insights?.highOddsMatches?.length ||
      teamOddsSurface?.ctaConfig?.primaryAffiliate?.href ||
      teamOddsSurface?.ctaConfig?.funnelActions?.length
  );
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      ...(sportHref ? [{ name: team.sport.name, path: sportHref }] : []),
      ...(countryHref
        ? [{ name: team.selectedCompetition?.country || team.country, path: countryHref }]
        : []),
      ...(team.selectedCompetition
        ? [{ name: team.selectedCompetition.name, path: buildCompetitionHref(locale, team.selectedCompetition) }]
        : []),
      { name: team.name, path: `/${locale}/teams/${team.id}` },
    ]),
    buildSportsTeamStructuredData({
      path: `/${locale}/teams/${team.id}`,
      name: team.name,
      sport: team.sport?.name,
      country: team.country,
      league: team.selectedCompetition?.name || team.league?.name,
      description: formatDictionaryText(dictionary.metaTeamDescription, { name: team.name }),
    }),
    buildWebPageStructuredData({
      path: buildTeamPageHref(locale, team.id, {
        tab: activeTab,
        competition: selectedCompetitionRef,
        season: selectedSeasonRef,
        standing: team.standingsTable.selectedView,
        territory: filters?.territory,
      }),
      name: buildTeamMetadataCopy(dictionary, team, activeTab).title,
      description: buildTeamMetadataCopy(dictionary, team, activeTab).description,
      inLanguage: locale,
      about: [
        team.sport ? { type: "Thing", name: team.sport.name, path: sportHref } : null,
        team.selectedCompetition
          ? {
              type: "SportsOrganization",
              name: team.selectedCompetition.name,
              path: buildCompetitionHref(locale, team.selectedCompetition),
            }
          : null,
        { type: "SportsTeam", name: team.name, path: `/${locale}/teams/${team.id}` },
      ].filter(Boolean),
      monetization:
        activeTab === "competitions" || hasCompetitionInsights
          ? {
              name: dictionary.competitionInsights,
              description: dictionary.competitionInsightsLead,
              isAccessibleForFree: true,
              accessibilitySummary: dictionary.oddsLegalAge,
              conditionsOfAccess: dictionary.oddsLegalJurisdiction,
              genre: "Sports betting insights",
            }
          : null,
    }),
    activeTab === "standings"
      ? buildStandingsStructuredData({
          path: buildTeamPageHref(locale, team.id, {
            tab: "standings",
            competition: selectedCompetitionRef,
            season: selectedSeasonRef,
            standing: team.standingsTable.selectedView,
            territory: filters?.territory,
          }),
          name: `${team.name} ${dictionary.standings}`,
          description: dictionary.standings,
          rows: team.standingsTable.rows.map((row) => ({
            ...row,
            team: {
              ...row.team,
              path: `/${locale}/teams/${row.team.id}`,
            },
          })),
        })
      : null,
  ];

  const oddsContent = teamOddsSurface ? (
    <div className={styles.surfaceStack}>
      <div className={styles.surfaceSummary}>
        <span className={styles.badge}>
          {formatDictionaryText(dictionary.oddsSummaryFixtures, {
            count: teamOddsSurface.summary.fixtureCount,
          })}
        </span>
        <span className={styles.badge}>
          {dictionary.oddsSourcesLabel}: {teamOddsSurface.summary.bookmakerCount}
        </span>
        <span className={styles.badge}>{viewerTerritory}</span>
      </div>

      {teamOddsSurface.message ? <div className={styles.infoBanner}>{teamOddsSurface.message}</div> : null}

      {teamOddsSurface.bookmakers?.length ? (
        <div className={styles.inlineBadgeRow}>
          {teamOddsSurface.bookmakers.slice(0, 6).map((bookmaker) => (
            <span key={bookmaker.key} className={styles.legalChip}>
              {bookmaker.shortName || bookmaker.name}
            </span>
          ))}
        </div>
      ) : null}

      {teamOddsSurface.tabs.length ? (
        <CompetitionOddsTabs tabs={teamOddsSurface.tabs} locale={locale} />
      ) : (
        <div className={styles.emptyState}>{teamOddsSurface.message || dictionary.oddsUnavailable}</div>
      )}

      <div className={styles.legalStack}>
        {teamOddsSurface.legal.legalLines.map((line) => (
          <span key={line} className={styles.legalChip}>
            {line}
          </span>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

      <RecentViewTracker
        itemId={`team:${team.id}`}
        label={team.name}
        metadata={{
          leagueCode: team.selectedCompetition?.code || team.league?.code || null,
        }}
      />

      <header className={styles.pageHeader}>
        <div>
          <div className={styles.linkList}>
            {sportHref ? (
              <Link href={sportHref} className={styles.badge}>
                {team.sport.name}
              </Link>
            ) : null}
            {countryHref ? (
              <Link href={countryHref} className={styles.badge}>
                {team.selectedCompetition?.country || team.country}
              </Link>
            ) : team.country ? (
              <span className={styles.badge}>{team.country}</span>
            ) : null}
            {team.selectedCompetition ? (
              <Link href={buildCompetitionHref(locale, team.selectedCompetition)} className={styles.badge}>
                {team.selectedCompetition.name}
              </Link>
            ) : null}
            {team.selectedSeason ? <span className={styles.badge}>{team.selectedSeason.name}</span> : null}
          </div>
          <h1 className={styles.pageTitle}>{team.name}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.metaTeamDescription, { name: team.name })}
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{team.fixtureSummary.LIVE}</span>
          <FavoriteToggle
            itemId={`team:${team.id}`}
            locale={locale}
            label={team.name}
            metadata={{
              leagueCode: team.selectedCompetition?.code || team.league?.code || null,
            }}
            surface="team-detail"
          />
          <AlertSubscriptionControl
            itemId={`team:${team.id}`}
            locale={locale}
            supportedTypes={teamNews.total ? ["KICKOFF", "FINAL_RESULT", "NEWS"] : ["KICKOFF", "FINAL_RESULT"]}
            label={team.name}
            metadata={{
              leagueCode: team.selectedCompetition?.code || team.league?.code || null,
            }}
            surface="team-detail"
          />
          {team.selectedCompetition ? (
            <Link href={buildCompetitionHref(locale, team.selectedCompetition)} className={styles.actionLink}>
              {team.selectedCompetition.name}
            </Link>
          ) : null}
        </div>
      </header>

      <div className={styles.filterStack}>
        <div className={styles.filterRow}>
          {[
            { key: "summary", label: dictionary.overview },
            { key: "fixtures", label: dictionary.fixtures },
            { key: "results", label: dictionary.results },
            { key: "standings", label: dictionary.standings },
            { key: "squad", label: dictionary.squads },
            { key: "competitions", label: dictionary.linkedCompetitions },
            { key: "news", label: dictionary.news },
            { key: "archive", label: dictionary.archive },
          ].map((item) => (
            <Link
              key={item.key}
              href={buildTeamPageHref(locale, team.id, {
                tab: item.key,
                competition: selectedCompetitionRef,
                season: selectedSeasonRef,
                standing: team.standingsTable.selectedView,
                territory: filters?.territory,
              })}
              className={item.key === activeTab ? styles.filterChipActive : styles.filterChip}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {team.linkedCompetitions.length ? (
          <div className={styles.filterRow}>
            {team.linkedCompetitions.map((competition) => {
              const competitionReference = competition.code || competition.leagueId || competition.id;
              const isActive = competitionReference === selectedCompetitionRef;

              return (
                <Link
                  key={`${competition.leagueId || competition.code}-${competition.seasonName || "current"}`}
                  href={buildTeamPageHref(locale, team.id, {
                    tab: activeTab,
                    competition: competitionReference,
                    standing: team.standingsTable.selectedView,
                    territory: filters?.territory,
                  })}
                  className={isActive ? styles.filterChipActive : styles.filterChip}
                >
                  {competition.name}
                  {competition.isCurrent ? <span className={styles.filterCount}>{dictionary.currentSeason}</span> : null}
                </Link>
              );
            })}
          </div>
        ) : null}

        {team.seasons.length ? (
          <div className={styles.filterRow}>
            {team.seasons.map((season) => {
              const seasonReference = season.externalRef || season.id || season.name;
              const isActive = seasonReference === selectedSeasonRef;

              return (
                <Link
                  key={season.id}
                  href={buildTeamPageHref(locale, team.id, {
                    tab: activeTab,
                    competition: selectedCompetitionRef,
                    season: seasonReference,
                    standing: team.standingsTable.selectedView,
                    territory: filters?.territory,
                  })}
                  className={isActive ? styles.filterChipActive : styles.filterChip}
                >
                  {season.name}
                  {season.isCurrent ? <span className={styles.filterCount}>{dictionary.currentSeason}</span> : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeTab === "summary" ? (
        <>
          {hasCompetitionInsights ? (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{dictionary.competitionInsights}</p>
                  <h2 className={styles.sectionTitle}>{dictionary.competitionInsights}</h2>
                  <p className={styles.sectionLead}>{dictionary.competitionInsightsLead}</p>
                </div>
                {teamOddsSurface?.bookmakers?.length ? (
                  <span className={styles.badge}>{teamOddsSurface.bookmakers.length}</span>
                ) : null}
              </div>

              <OddsPredictionWidgets
                locale={locale}
                dictionary={dictionary}
                surface="team-detail"
                entityType="team"
                entityId={team.id}
                insights={teamOddsSurface.insights}
                ctaConfig={teamOddsSurface.ctaConfig}
              />
            </section>
          ) : null}

          <div className={styles.detailGrid}>
            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
                <span className={styles.badge}>
                  {getStandingViewLabel(team.standingsTable.selectedView, dictionary)}
                </span>
              </div>
              <StandingsTable
                rows={team.standingsTable.rows.slice(0, 8)}
                dictionary={dictionary}
                locale={locale}
                highlightTeamIds={[team.id]}
              />
            </article>

            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{dictionary.linkedCompetitions}</h2>
                <span className={styles.badge}>{team.linkedCompetitions.length}</span>
              </div>
              {team.linkedCompetitions.length ? (
                <div className={styles.railList}>
                  {team.linkedCompetitions.slice(0, 8).map((competition) => (
                    <Link
                      key={`${competition.leagueId || competition.code}-${competition.name}`}
                      href={buildTeamPageHref(locale, team.id, {
                        competition: competition.code || competition.leagueId || competition.id,
                        territory: filters?.territory,
                      })}
                      className={styles.railLink}
                    >
                      {competition.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>{dictionary.noData}</div>
              )}

              {team.selectedCompetition ? (
                <div className={styles.fixtureActionRow}>
                  <Link
                    href={buildCompetitionHref(locale, team.selectedCompetition)}
                    className={styles.sectionAction}
                  >
                    {dictionary.liveBoardOpenLeague}
                  </Link>
                  <Link
                    href={buildTeamPageHref(locale, team.id, {
                      tab: "archive",
                      competition: selectedCompetitionRef,
                      territory: filters?.territory,
                    })}
                    className={styles.actionLink}
                  >
                    {dictionary.archive}
                  </Link>
                </div>
              ) : null}
            </article>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.fixtures}</p>
                <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
              </div>
              <Link
                href={buildTeamPageHref(locale, team.id, {
                  tab: "fixtures",
                  competition: selectedCompetitionRef,
                  season: selectedSeasonRef,
                  territory: filters?.territory,
                })}
                className={styles.sectionAction}
              >
                {dictionary.browseAll}
              </Link>
            </div>
            {team.upcomingFixtures.length ? (
              <div className={styles.fixtureGrid}>
                {team.upcomingFixtures.slice(0, 6).map((fixture) => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    locale={locale}
                    showAlerts
                    alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                    surface="team-detail"
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{dictionary.noData}</div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.results}</p>
                <h2 className={styles.sectionTitle}>{dictionary.results}</h2>
              </div>
              <Link
                href={buildTeamPageHref(locale, team.id, {
                  tab: "results",
                  competition: selectedCompetitionRef,
                  season: selectedSeasonRef,
                  territory: filters?.territory,
                })}
                className={styles.sectionAction}
              >
                {dictionary.browseAll}
              </Link>
            </div>
            {team.recentResults.length ? (
              <div className={styles.fixtureGrid}>
                {team.recentResults.slice(0, 6).map((fixture) => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    locale={locale}
                    showAlerts
                    alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                    surface="team-detail"
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>{dictionary.noData}</div>
            )}
          </section>

          {flags.teamNews ? (
            <NewsModule
              locale={locale}
              dictionary={dictionary}
              eyebrow={dictionary.news}
              title={dictionary.newsTeamModuleTitle}
              lead={dictionary.newsTeamModuleLead}
              articles={teamNews.articles}
              href="/news"
              actionLabel={dictionary.browseAll}
              emptyLabel={dictionary.newsEmpty}
              trackingSurface="team-news-module"
              promo={teamNewsExperience.promo}
            />
          ) : null}
        </>
      ) : null}

      {activeTab === "fixtures" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.fixtures}</p>
              <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
            </div>
            <span className={styles.badge}>{team.upcomingFixtures.length}</span>
          </div>
          {team.upcomingFixtures.length ? (
            <div className={styles.fixtureGrid}>
              {team.upcomingFixtures.map((fixture) => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  locale={locale}
                  showAlerts
                  alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                  surface="team-detail"
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}

      {activeTab === "results" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.results}</p>
              <h2 className={styles.sectionTitle}>{dictionary.results}</h2>
            </div>
            <span className={styles.badge}>{team.recentResults.length}</span>
          </div>
          {team.recentResults.length ? (
            <div className={styles.fixtureGrid}>
              {team.recentResults.map((fixture) => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  locale={locale}
                  showAlerts
                  alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                  surface="team-detail"
                />
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
            <span className={styles.badge}>{team.standingsTable.rows.length}</span>
          </div>

          <div className={styles.filterRow}>
            {team.standingsTable.availableViews.map((view) => (
              <Link
                key={view}
                href={buildTeamPageHref(locale, team.id, {
                  tab: "standings",
                  competition: selectedCompetitionRef,
                  season: selectedSeasonRef,
                  standing: view,
                  territory: filters?.territory,
                })}
                className={
                  view === team.standingsTable.selectedView ? styles.filterChipActive : styles.filterChip
                }
              >
                {getStandingViewLabel(view, dictionary)}
              </Link>
            ))}
          </div>

          <StandingsTable
            rows={team.standingsTable.rows}
            dictionary={dictionary}
            locale={locale}
            highlightTeamIds={[team.id]}
          />
        </section>
      ) : null}

      {activeTab === "squad" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.squads}</p>
              <h2 className={styles.sectionTitle}>{dictionary.squads}</h2>
            </div>
            <span className={styles.badge}>{team.roster.length}</span>
          </div>
          {team.roster.length ? (
            <div className={styles.analysisGrid}>
              {team.roster.map((player) => (
                <article key={player.id || player.name} className={styles.detailCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{player.name}</h3>
                    {player.shortName ? <span className={styles.badge}>{player.shortName}</span> : null}
                  </div>
                  {player.countryName ? <p className={styles.muted}>{player.countryName}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </section>
      ) : null}

      {activeTab === "competitions" ? (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{dictionary.linkedCompetitions}</p>
                <h2 className={styles.sectionTitle}>{dictionary.linkedCompetitions}</h2>
              </div>
              <span className={styles.badge}>{team.linkedCompetitions.length}</span>
            </div>

            {team.linkedCompetitions.length ? (
              <div className={styles.teamGrid}>
                {team.linkedCompetitions.map((competition) => {
                  const competitionReference = competition.code || competition.leagueId || competition.id;
                  const isActive = competitionReference === selectedCompetitionRef;

                  return (
                    <article
                      key={`${competition.leagueId || competition.code}-${competition.name}`}
                      className={styles.teamCard}
                    >
                      <div className={styles.cardHeader}>
                        <div>
                          <p className={styles.cardTitle}>{competition.name}</p>
                          <p className={styles.muted}>{competition.country || dictionary.international}</p>
                        </div>
                        {isActive ? <span className={styles.liveBadge}>{dictionary.currentSeason}</span> : null}
                      </div>

                      <div className={styles.fixtureActionRow}>
                        <Link
                          href={buildTeamPageHref(locale, team.id, {
                            competition: competitionReference,
                            territory: filters?.territory,
                          })}
                          className={styles.sectionAction}
                        >
                          {dictionary.overview}
                        </Link>
                        {competition.code ? (
                          <Link href={buildCompetitionHref(locale, competition)} className={styles.actionLink}>
                            {dictionary.liveBoardOpenLeague}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>{dictionary.noData}</div>
            )}
          </section>

          {teamOddsSurface ? (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{dictionary.markets}</p>
                  <h2 className={styles.sectionTitle}>{dictionary.competitionOdds}</h2>
                  <p className={styles.sectionLead}>{dictionary.competitionOddsLead}</p>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={surfaceTone(teamOddsSurface.state)}>{teamOddsSurface.stateLabel}</span>
                  <span className={styles.badge}>{teamOddsSurface.summary.fixtureCount}</span>
                </div>
              </div>

              <ModuleEngagementTracker
                moduleType="team_competition_odds"
                entityType="team"
                entityId={team.id}
                surface="team-detail"
                metadata={{
                  competitionCode: team.selectedCompetition?.code || null,
                  viewerTerritory,
                }}
              >
                {shouldGateOdds ? (
                  <RegulatedContentGate
                    storageKey={`sports:age-gate:team:${team.id}:competition-odds`}
                    title={teamOddsSurface.legal.gateTitle}
                    body={teamOddsSurface.legal.gateBody}
                    confirmLabel={teamOddsSurface.legal.gateConfirmLabel}
                    legalLines={teamOddsSurface.legal.legalLines}
                  >
                    {oddsContent}
                  </RegulatedContentGate>
                ) : (
                  oddsContent
                )}
              </ModuleEngagementTracker>
            </section>
          ) : null}
        </>
      ) : null}

      {activeTab === "news" ? (
        flags.teamNews ? (
          <NewsModule
            locale={locale}
            dictionary={dictionary}
            eyebrow={dictionary.news}
            title={dictionary.newsTeamModuleTitle}
            lead={dictionary.newsTeamModuleLead}
            articles={teamNews.articles}
            href="/news"
            actionLabel={dictionary.browseAll}
            emptyLabel={dictionary.newsEmpty}
            trackingSurface="team-news-tab"
            promo={teamNewsExperience.promo}
          />
        ) : (
          <div className={styles.emptyState}>{dictionary.newsHubDisabled}</div>
        )
      ) : null}

      {activeTab === "archive" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{dictionary.archive}</p>
              <h2 className={styles.sectionTitle}>{dictionary.archive}</h2>
            </div>
            <span className={styles.badge}>{team.archiveSeasons.length}</span>
          </div>

          {team.archiveSeasons.length ? (
            <div className={styles.leagueGrid}>
              {team.archiveSeasons.map((season) => {
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
                        href={buildTeamPageHref(locale, team.id, {
                          competition: selectedCompetitionRef,
                          season: seasonReference,
                          territory: filters?.territory,
                        })}
                        className={styles.sectionAction}
                      >
                        {dictionary.overview}
                      </Link>
                      <Link
                        href={buildTeamPageHref(locale, team.id, {
                          tab: "standings",
                          competition: selectedCompetitionRef,
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
