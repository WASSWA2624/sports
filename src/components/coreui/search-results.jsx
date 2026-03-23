"use client";

import Link from "next/link";
import { FavoriteToggle } from "./favorite-toggle";
import sharedStyles from "./styles.module.css";
import styles from "./search-experience.module.css";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";

function getResultTypeLabel(result, dictionary) {
  switch (result?.type) {
    case "competition":
      return dictionary.competition;
    case "team":
      return dictionary.teams;
    case "match":
      return dictionary.match;
    case "player":
      return dictionary.player;
    case "article":
      return dictionary.news;
    default:
      return dictionary.search;
  }
}

export function SearchResultsSection({
  title,
  locale,
  dictionary,
  results = [],
  surface = "search",
  query = "",
  compact = false,
  onResultClick,
}) {
  if (!results.length) {
    return null;
  }

  return (
    <section className={styles.resultsSection}>
      {title ? (
        <div className={sharedStyles.sectionHeader}>
          <div>
            <h2 className={sharedStyles.sectionTitle}>{title}</h2>
          </div>
          <span className={sharedStyles.badge}>{results.length}</span>
        </div>
      ) : null}

      <div className={compact ? styles.resultListCompact : styles.resultList}>
        {results.map((result) => {
          const content = (
            <>
              <div className={styles.resultMeta}>
                <span className={sharedStyles.badge}>
                  {getResultTypeLabel(result, dictionary)}
                </span>
              </div>

              <div className={styles.resultCopy}>
                <div className={styles.resultTitleRow}>
                  <strong className={styles.resultTitle}>{result.title}</strong>
                </div>
                {result.subtitle ? <p className={styles.resultSubtitle}>{result.subtitle}</p> : null}
              </div>
            </>
          );

          const handleResultClick = () => {
            trackProductAnalyticsEvent({
              event: "search_result_click",
              surface,
              entityType: result.type,
              entityId: result.id,
              query,
              action: result.href,
              metadata: {
                itemId: result.itemId || null,
              },
            });

            onResultClick?.(result);
          };

          return (
            <article
              key={result.key || `${result.type}:${result.id}`}
              className={compact ? styles.resultCardCompact : styles.resultCard}
            >
              {result.href ? (
                <Link href={result.href} className={styles.resultLink} onClick={handleResultClick}>
                  {content}
                </Link>
              ) : (
                <div className={styles.resultLinkMuted}>{content}</div>
              )}

              {result.itemId ? (
                <FavoriteToggle
                  itemId={result.itemId}
                  locale={locale}
                  compact
                  label={result.title}
                  surface={surface}
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
