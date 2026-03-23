import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CompetitionOddsTabs } from "../../../../components/coreui/competition-odds-tabs";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { ModuleEngagementTracker } from "../../../../components/coreui/module-engagement-tracker";
import { RegulatedContentGate } from "../../../../components/coreui/regulated-content-gate";
import styles from "../../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { resolveViewerTerritory } from "../../../../lib/coreui/odds-broadcast";
import { getLeagueDetail } from "../../../../lib/coreui/read";

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
    `/leagues/${leagueCode}`
  );
}

export default async function LeagueDetailPage({ params, searchParams }) {
  const { locale, leagueCode } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const viewerTerritory = resolveViewerTerritory({
    territory: filters?.territory,
    headers: await headers(),
  });
  const league = await getLeagueDetail(leagueCode, {
    locale,
    viewerTerritory,
  });

  if (!league) {
    notFound();
  }

  const standings = league.seasons[0]?.standings || [];
  const oddsSurface = league.competitionOdds;
  const shouldGateOdds = oddsSurface.enabled && oddsSurface.tabs.length > 0;

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

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
          <h1 className={styles.pageTitle}>{league.name}</h1>
        </div>
        <Link href={`/${locale}/tables`} className={styles.actionLink}>
          {dictionary.standings}
        </Link>
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
          </div>
          {standings.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{dictionary.tablePosition}</th>
                  <th>{dictionary.tableTeam}</th>
                  <th>{dictionary.tablePlayed}</th>
                  <th>{dictionary.tablePoints}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position}</td>
                    <td>{row.team.name}</td>
                    <td>{row.played}</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>{dictionary.noData}</div>
          )}
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.teams}</h2>
          </div>
          {league.teams.length ? (
            <div className={styles.teamGrid}>
              {league.teams.map((team) => (
                <Link key={team.id} href={`/${locale}/teams/${team.id}`} className={styles.teamCard}>
                  <p className={styles.cardTitle}>{team.name}</p>
                  <p className={styles.muted}>{team.shortName || team.code || league.name}</p>
                </Link>
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
            <p className={styles.eyebrow}>{dictionary.markets}</p>
            <h2 className={styles.sectionTitle}>{dictionary.competitionOdds}</h2>
            <p className={styles.sectionLead}>{dictionary.competitionOddsLead}</p>
          </div>
          <div className={styles.inlineBadgeRow}>
            <span className={surfaceTone(oddsSurface.state)}>{oddsSurface.stateLabel}</span>
            <span className={styles.badge}>{oddsSurface.summary.fixtureCount}</span>
          </div>
        </div>

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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.overview}</p>
            <h2 className={styles.sectionTitle}>{dictionary.upcoming}</h2>
          </div>
        </div>
        {league.fixtures.length ? (
          <div className={styles.fixtureGrid}>
            {league.fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>
    </section>
  );
}
