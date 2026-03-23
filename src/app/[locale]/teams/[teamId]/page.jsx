import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { NewsModule } from "../../../../components/coreui/news-module";
import styles from "../../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getTeamNewsModule } from "../../../../lib/coreui/news-read";
import { getTeamDetail } from "../../../../lib/coreui/read";
import {
  buildCompetitionHref,
  buildCountryHref,
  buildSportHref,
} from "../../../../lib/coreui/routes";

export async function generateMetadata({ params }) {
  const { locale, teamId } = await params;
  const team = await getTeamDetail(teamId);
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    team?.name || dictionary.metaTeamFallbackTitle,
    team
      ? formatDictionaryText(dictionary.metaTeamDescription, { name: team.name })
      : dictionary.metaTeamFallbackDescription,
    `/teams/${teamId}`
  );
}

export default async function TeamDetailPage({ params }) {
  const { locale, teamId } = await params;
  const dictionary = getDictionary(locale);
  const [team, flags] = await Promise.all([getTeamDetail(teamId), getPublicSurfaceFlags()]);

  if (!team) {
    notFound();
  }

  const teamNews = flags.news ? await getTeamNewsModule(team.id, 4) : { articles: [], total: 0 };
  const sportHref = team.sport ? buildSportHref(locale, team.sport) : null;
  const countryHref =
    team.country && team.sport && team.league?.countryRecord
      ? buildCountryHref(locale, team.league.countryRecord, team.sport)
      : null;
  const primaryCompetition = team.linkedCompetitions[0] || null;

  return (
    <section className={styles.section}>
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
                {team.country}
              </Link>
            ) : team.country ? (
              <span className={styles.badge}>{team.country}</span>
            ) : null}
            {primaryCompetition ? (
              <Link href={buildCompetitionHref(locale, primaryCompetition)} className={styles.badge}>
                {primaryCompetition.name}
              </Link>
            ) : null}
          </div>
          <h1 className={styles.pageTitle}>{team.name}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.metaTeamDescription, { name: team.name })}
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{team.fixtureSummary.LIVE}</span>
          {primaryCompetition ? (
            <Link href={buildCompetitionHref(locale, primaryCompetition)} className={styles.actionLink}>
              {primaryCompetition.name}
            </Link>
          ) : null}
        </div>
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
            <span className={styles.badge}>{team.standings.length}</span>
          </div>
          {team.standings.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{dictionary.tableLeague}</th>
                  <th>{dictionary.season}</th>
                  <th>{dictionary.tablePosition}</th>
                  <th>{dictionary.tablePlayed}</th>
                  <th>{dictionary.tablePoints}</th>
                </tr>
              </thead>
              <tbody>
                {team.standings.map((standing) => (
                  <tr key={standing.id}>
                    <td>
                      <Link
                        href={buildCompetitionHref(locale, {
                          code: standing.season?.league?.code,
                        })}
                      >
                        {standing.season?.league?.name || standing.competition?.name || dictionary.competition}
                      </Link>
                    </td>
                    <td>{standing.season?.name || dictionary.noData}</td>
                    <td>{standing.position}</td>
                    <td>{standing.played}</td>
                    <td>{standing.points}</td>
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
            <h2 className={styles.cardTitle}>{dictionary.linkedCompetitions}</h2>
            <span className={styles.badge}>{team.linkedCompetitions.length}</span>
          </div>
          {team.linkedCompetitions.length ? (
            <div className={styles.railList}>
              {team.linkedCompetitions.map((competition) => (
                <Link
                  key={`${competition.code}-${competition.seasonName || "current"}`}
                  href={buildCompetitionHref(locale, competition)}
                  className={styles.railLink}
                >
                  {competition.name}
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
            <p className={styles.eyebrow}>{dictionary.fixtures}</p>
            <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
          </div>
          <span className={styles.badge}>{team.upcomingFixtures.length}</span>
        </div>
        {team.upcomingFixtures.length ? (
          <div className={styles.fixtureGrid}>
            {team.upcomingFixtures.map((fixture) => (
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
            <p className={styles.eyebrow}>{dictionary.results}</p>
            <h2 className={styles.sectionTitle}>{dictionary.results}</h2>
          </div>
          <span className={styles.badge}>{team.recentResults.length}</span>
        </div>
        {team.recentResults.length ? (
          <div className={styles.fixtureGrid}>
            {team.recentResults.map((fixture) => (
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

      {flags.news ? (
        <NewsModule
          locale={locale}
          eyebrow={dictionary.news}
          title={dictionary.newsTeamModuleTitle}
          lead={dictionary.newsTeamModuleLead}
          articles={teamNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
        />
      ) : null}
    </section>
  );
}
