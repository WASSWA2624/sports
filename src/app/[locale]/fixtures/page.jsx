import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getUpcomingFixtures } from "../../../lib/coreui/read";
import { FixtureCard } from "../../../components/coreui/fixture-card";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaFixturesTitle,
    getDictionary(locale).metaFixturesDescription,
    "/fixtures"
  );
}

export default async function FixturesPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const fixtures = await getUpcomingFixtures();

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dictionary.upcoming}</h1>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{fixtures.length}</span>
        </div>
      </header>
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
  );
}
