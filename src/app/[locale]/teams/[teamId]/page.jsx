import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import { getTeamNewsModule } from "../../../../lib/coreui/news-read";
import { getTeamDetail } from "../../../../lib/coreui/read";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { NewsModule } from "../../../../components/coreui/news-module";
import styles from "../../../../components/coreui/styles.module.css";

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

  const fixtures = [...team.homeFor, ...team.awayFor]
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, 8);

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{team.league?.name || dictionary.teams}</p>
          <h1 className={styles.pageTitle}>{team.name}</h1>
        </div>
        {team.league ? (
          <Link href={`/${locale}/leagues/${team.league.code}`} className={styles.actionLink}>
            {team.league.name}
          </Link>
        ) : null}
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.standings}</h2>
          </div>
          {team.standings.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{dictionary.tableLeague}</th>
                  <th>{dictionary.tablePosition}</th>
                  <th>{dictionary.tablePlayed}</th>
                  <th>{dictionary.tablePoints}</th>
                </tr>
              </thead>
              <tbody>
                {team.standings.map((standing) => (
                  <tr key={standing.id}>
                    <td>{standing.season.league.name}</td>
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
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.recent}</p>
            <h2 className={styles.sectionTitle}>{dictionary.matchDetail}</h2>
          </div>
        </div>
        {fixtures.length ? (
          <div className={styles.fixtureGrid}>
            {fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
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
