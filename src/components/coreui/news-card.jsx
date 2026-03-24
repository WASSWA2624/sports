import Link from "next/link";
import sharedStyles from "./styles.module.css";
import styles from "./news-card.module.css";
import { formatArticleEntityLabel } from "../../lib/coreui/news";

function formatPublishedAt(value, locale) {
  if (!value) {
    return "Draft";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NewsCard({
  article,
  locale,
  compact = false,
  priority = false,
}) {
  const href = `/${locale}/news/${article.slug}`;
  const entityLabel = formatArticleEntityLabel(article);
  const articleClassName = compact
    ? `${sharedStyles.panel} ${styles.card} ${styles.cardCompact}`
    : `${sharedStyles.panel} ${styles.card}`;
  const visualStyle = article.heroImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(7, 16, 28, 0.08), rgba(7, 16, 28, 0.7)), url(${article.heroImageUrl})`,
      }
    : undefined;

  return (
    <article className={articleClassName} data-priority={priority ? "true" : "false"}>
      <Link href={href} className={styles.cardLink} data-news-article-id={article.id}>
        <div className={compact ? styles.visualCompact : styles.visual} style={visualStyle}>
          <span className={sharedStyles.badge}>{article.topicLabel}</span>
          <strong className={styles.visualTitle}>
            {article.primaryCompetition?.shortName ||
              article.primaryCompetition?.name ||
              article.primarySport?.name ||
              "News"}
          </strong>
        </div>

        <div className={styles.copy}>
          <div className={sharedStyles.metaRow}>
            <span>{formatPublishedAt(article.publishedAt, locale)}</span>
            <span>{article.readingTimeMinutes} min read</span>
          </div>

          <h3 className={compact ? sharedStyles.cardTitle : sharedStyles.sectionTitle}>
            {article.title}
          </h3>

          {!compact ? <p className={sharedStyles.muted}>{article.excerpt}</p> : null}

          {entityLabel ? <p className={styles.entityLine}>{entityLabel}</p> : null}

          {article.entities.teams.length || article.entities.competitions.length ? (
            <div className={sharedStyles.inlineBadgeRow}>
              {article.entities.competitions.slice(0, 1).map((competition) => (
                <span key={competition.id} className={sharedStyles.badge}>
                  {competition.shortName || competition.name}
                </span>
              ))}
              {article.entities.teams.slice(0, compact ? 1 : 2).map((team) => (
                <span key={team.id} className={sharedStyles.badge}>
                  {team.shortName || team.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
