import Link from "next/link";
import { NewsCard } from "./news-card";
import styles from "./styles.module.css";

export function NewsModule({
  locale,
  eyebrow,
  title,
  lead = null,
  articles = [],
  href = null,
  compact = true,
  actionLabel = "View all",
  emptyLabel = "No articles published yet.",
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.sectionTitle}>{title}</h2>
          {lead ? <p className={styles.sectionLead}>{lead}</p> : null}
        </div>
        {href ? (
          <Link href={`/${locale}${href}`} className={styles.sectionAction}>
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {articles.length ? (
        <div className={styles.grid}>
          {articles.map((article, index) => (
            <NewsCard
              key={article.id}
              article={article}
              locale={locale}
              compact={compact}
              priority={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>{emptyLabel}</div>
      )}
    </section>
  );
}
