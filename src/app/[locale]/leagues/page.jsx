import Link from "next/link";
import { FavoriteToggle } from "../../../components/coreui/favorite-toggle";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { formatFixtureStatus } from "../../../lib/coreui/format";
import { getLeagueDirectory } from "../../../lib/coreui/read";
import { getPersonalizationSnapshot, sortCompetitionsByPersonalization } from "../../../lib/personalization";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaLeaguesTitle,
    getDictionary(locale).metaLeaguesDescription,
    "/leagues"
  );
}

export default async function LeaguesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const [leagues, personalization] = await Promise.all([
    getLeagueDirectory(),
    getPersonalizationSnapshot(),
  ]);
  const prioritizedLeagues = sortCompetitionsByPersonalization(
    leagues,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.leagues}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{prioritizedLeagues.length}</span>
        </div>
      </header>
      {prioritizedLeagues.length ? (
        <div className={styles.leagueGrid}>
          {prioritizedLeagues.map((league) => (
            <article key={league.id} className={styles.leagueCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
                  <h2 className={styles.cardTitle}>
                    <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                  </h2>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={styles.badge}>{league.teams.length}</span>
                  <FavoriteToggle
                    itemId={`competition:${league.code}`}
                    locale={locale}
                    compact
                    label={league.name}
                    metadata={{
                      country: league.country || null,
                    }}
                    surface="leagues-directory"
                  />
                </div>
              </div>
              <p className={styles.metaRow}>
                {league.fixtures[0]?.status
                  ? formatFixtureStatus(league.fixtures[0].status, locale)
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
