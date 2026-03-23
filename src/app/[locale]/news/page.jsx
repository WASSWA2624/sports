import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import styles from "../../../components/coreui/styles.module.css";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildPageMetadata(
    locale,
    getDictionary(locale).metaNewsTitle,
    getDictionary(locale).metaNewsDescription,
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
          <p className={styles.pageLead}>{dictionary.newsLead}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>{dictionary.newsGlobalFeed}</h2>
          <p className={styles.muted}>{dictionary.newsGlobalFeedBody}</p>
        </article>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>{dictionary.newsCompetitionModules}</h2>
          <p className={styles.muted}>{dictionary.newsCompetitionModulesBody}</p>
        </article>
        <article className={styles.panel}>
          <h2 className={styles.cardTitle}>{dictionary.newsArticlePages}</h2>
          <p className={styles.muted}>{dictionary.newsArticlePagesBody}</p>
        </article>
      </div>
    </section>
  );
}
