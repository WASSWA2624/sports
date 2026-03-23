import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getTeamDirectory } from "../../../lib/coreui/read";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaTeamsTitle,
    getDictionary(locale).metaTeamsDescription,
    "/teams"
  );
}

export default async function TeamsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const teams = await getTeamDirectory();

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.teams}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{teams.length}</span>
        </div>
      </header>
      {teams.length ? (
        <div className={styles.teamGrid}>
          {teams.map((team) => (
            <article key={team.id} className={styles.teamCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>
                    <Link href={`/${locale}/teams/${team.id}`}>{team.name}</Link>
                  </h2>
                  <p className={styles.muted}>{team.shortName || team.code || dictionary.teamProfile}</p>
                </div>
                {team.league ? (
                  <Link href={`/${locale}/leagues/${team.league.code}`} className={styles.badge}>
                    {team.league.name}
                  </Link>
                ) : null}
              </div>
              <p className={styles.metaRow}>
                {team.homeFor[0]?.status
                  ? formatFixtureStatus(team.homeFor[0].status, locale)
                  : dictionary.noData}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{dictionary.noData}</div>
      )}
    </section>
  );
}
