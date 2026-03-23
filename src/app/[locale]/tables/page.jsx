import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getTablesOverview } from "../../../lib/coreui/read";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    "Tables",
    "Current league tables and top positions across active competitions.",
    "/tables"
  );
}

export default async function TablesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const leagues = await getTablesOverview();

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.standings}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{leagues.length}</span>
        </div>
      </header>
      {leagues.length ? (
        <div className={styles.tableGrid}>
          {leagues.map((league) => {
            const standings = league.seasons[0]?.standings || [];
            return (
              <article key={league.id} className={styles.tableCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{league.country || "International"}</p>
                    <h2 className={styles.cardTitle}>
                      <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                    </h2>
                  </div>
                </div>
                {standings.length ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>Pts</th>
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
