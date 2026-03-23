import Link from "next/link";
import { StructuredData } from "../../../components/coreui/structured-data";
import { FavoriteToggle } from "../../../components/coreui/favorite-toggle";
import {
  buildBreadcrumbStructuredData,
  buildCollectionPageStructuredData,
  buildPageMetadata,
} from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getTablesOverview } from "../../../lib/coreui/read";
import { getPersonalizationSnapshot, sortCompetitionsByPersonalization } from "../../../lib/personalization";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaTablesTitle,
    getDictionary(locale).metaTablesDescription,
    "/tables",
    {
      keywords: [getDictionary(locale).standings, getDictionary(locale).leagues],
    }
  );
}

export default async function TablesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [leagues, personalization] = await Promise.all([
    getTablesOverview(),
    getPersonalizationSnapshot(),
  ]);
  const prioritizedLeagues = sortCompetitionsByPersonalization(
    leagues,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      { name: dictionary.standings, path: `/${locale}/tables` },
    ]),
    buildCollectionPageStructuredData({
      path: `/${locale}/tables`,
      name: dictionary.standings,
      description: dictionary.metaTablesDescription,
      items: prioritizedLeagues.slice(0, 12).map((league) => ({
        name: league.name,
        path: `/${locale}/leagues/${league.code}`,
      })),
    }),
  ];

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.standings}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{prioritizedLeagues.length}</span>
        </div>
      </header>
      {prioritizedLeagues.length ? (
        <div className={styles.tableGrid}>
          {prioritizedLeagues.map((league) => {
            const standings = league.seasons[0]?.standings || [];
            return (
              <article key={league.id} className={styles.tableCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
                    <h2 className={styles.cardTitle}>
                      <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                    </h2>
                  </div>
                  <FavoriteToggle
                    itemId={`competition:${league.code}`}
                    locale={locale}
                    compact
                    label={league.name}
                    metadata={{
                      country: league.country || null,
                    }}
                    surface="tables-overview"
                  />
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
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>{dictionary.noData}</div>
      )}
    </section>
  );
}
