import Link from "next/link";
import { NewsCard } from "./news-card";
import { NewsEngagementTracker } from "./news-engagement-tracker";
import { NewsPromoUnit } from "./news-promo-unit";
import styles from "./styles.module.css";

export function NewsModule({
  locale,
  dictionary = null,
  eyebrow,
  title,
  lead = null,
  articles = [],
  href = null,
  compact = true,
  actionLabel = "View all",
  emptyLabel = "No articles published yet.",
  trackingSurface = "news-module",
  promo = null,
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
        <NewsEngagementTracker
          surface={trackingSurface}
          articleIds={articles.map((article) => article.id)}
        >
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
        </NewsEngagementTracker>
      ) : (
        <div className={styles.emptyState}>{emptyLabel}</div>
      )}

      {dictionary ? (
        <NewsPromoUnit
          dictionary={dictionary}
          promo={promo}
          surface={trackingSurface}
          variant="compact"
          moduleType="news_module_promo"
        />
      ) : null}
    </section>
  );
}
