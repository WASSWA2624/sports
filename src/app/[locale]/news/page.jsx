import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    "News",
    "Top-level sports news mode with room for global, team, and competition coverage.",
    "/news"
  );
}

export default async function NewsPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.news}</p>
          <h1 className={styles.pageTitle}>{dictionary.news}</h1>
          <p className={styles.pageLead}>
            The news hub now exists as a first-class mode in the shared shell. Editorial ingestion and
            article detail work continue in later phases.
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>Global feed</h2>
          <p className={styles.muted}>Top stories, sport grouping, and linked entities live here.</p>
        </article>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>Competition modules</h2>
          <p className={styles.muted}>
            League and team pages can surface related articles without leaving the shared shell.
          </p>
        </article>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>Article pages</h2>
          <p className={styles.muted}>
            SEO-ready article templates will layer onto this mode as editorial data lands.
          </p>
        </article>
      </div>
    </section>
  );
}
