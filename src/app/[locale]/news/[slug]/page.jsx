import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { NewsEngagementTracker } from "../../../../components/coreui/news-engagement-tracker";
import { NewsCard } from "../../../../components/coreui/news-card";
import { StructuredData } from "../../../../components/coreui/structured-data";
import sharedStyles from "../../../../components/coreui/styles.module.css";
import {
  buildBreadcrumbStructuredData,
  buildNewsArticleStructuredData,
  buildPageMetadata,
} from "../../../../lib/coreui/metadata";
import { getDictionary } from "../../../../lib/coreui/dictionaries";
import { getNewsArticleDetail } from "../../../../lib/coreui/news-read";
import styles from "../news.module.css";

function formatPublishedAt(value, locale) {
  if (!value) {
    return "Draft";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const dictionary = getDictionary(locale);
  const detail = await getNewsArticleDetail(slug);

  if (!detail) {
    return buildPageMetadata(
      locale,
      dictionary.metaNewsTitle,
      dictionary.metaNewsDescription,
      `/news/${slug}`
    );
  }

  const title = detail.article.seoTitle || detail.article.title;
  const description = detail.article.seoDescription || detail.article.excerpt;
  const metadata = buildPageMetadata(locale, title, description, `/news/${slug}`, {
    keywords: [
      title,
      detail.article.topicLabel,
      detail.article.primaryCompetition?.name,
      detail.article.primaryTeam?.name,
    ].filter(Boolean),
    openGraphType: "article",
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: detail.article.publishedAt || undefined,
    },
  };
}

export default async function NewsArticlePage({ params }) {
  const { locale, slug } = await params;
  const dictionary = getDictionary(locale);
  const detail = await getNewsArticleDetail(slug);

  if (!detail) {
    notFound();
  }

  const { article, relatedArticles } = detail;
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      { name: dictionary.news, path: `/${locale}/news` },
      { name: article.title, path: `/${locale}/news/${article.slug}` },
    ]),
    buildNewsArticleStructuredData({
      path: `/${locale}/news/${article.slug}`,
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      image: article.imageUrl,
      section: article.topicLabel,
    }),
  ];

  return (
    <section className={sharedStyles.section}>
      <StructuredData data={structuredData} />
      <NewsEngagementTracker
        surface="news-article-page"
        articleId={article.id}
        articleIds={relatedArticles.map((relatedArticle) => relatedArticle.id)}
      >
      <header className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{article.topicLabel}</p>
          <h1 className={sharedStyles.pageTitle}>{article.title}</h1>
          <p className={sharedStyles.pageLead}>{article.excerpt}</p>
        </div>
      </header>

      <div className={styles.storyLayout}>
        <article className={`${sharedStyles.panel} ${styles.storyPanel}`}>
          <div className={styles.heroVisual}>
            <span className={sharedStyles.badge}>{article.topicLabel}</span>
            <strong className={styles.heroTitle}>
              {article.primaryCompetition?.shortName ||
                article.primaryCompetition?.name ||
                article.primarySport?.name ||
                dictionary.news}
            </strong>
          </div>

          <div className={styles.storyMeta}>
            <span>{formatPublishedAt(article.publishedAt, locale)}</span>
            <span>{article.readingTimeMinutes} min read</span>
            {article.primaryCompetition?.name ? (
              <span>{article.primaryCompetition.name}</span>
            ) : null}
          </div>

          {article.entities.teams.length || article.entities.competitions.length ? (
            <div className={styles.storyTags}>
              {article.entities.competitions.map((competition) => (
                <Link
                  key={competition.id}
                  href={`/${locale}/leagues/${competition.code}`}
                  className={sharedStyles.badge}
                >
                  {competition.shortName || competition.name}
                </Link>
              ))}
              {article.entities.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/${locale}/teams/${team.id}`}
                  className={sharedStyles.badge}
                >
                  {team.shortName || team.name}
                </Link>
              ))}
            </div>
          ) : null}

          {article.bodyBlocks.length ? (
            <div className={styles.storyBody}>
              {article.bodyBlocks.map((block, index) => (
                <p key={`${index}-${block.slice(0, 32)}`} className={styles.storyParagraph}>
                  {block}
                </p>
              ))}
            </div>
          ) : (
            <div className={sharedStyles.emptyState}>{dictionary.newsBodyPending}</div>
          )}
        </article>

        <aside className={styles.sidebarStack}>
          {article.sourceUrl ? (
            <article className={`${sharedStyles.panel} ${styles.sidebarPanel}`}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>{dictionary.newsSource}</p>
                  <h2 className={sharedStyles.cardTitle}>{dictionary.newsSourceLabel}</h2>
                </div>
              </div>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.inlineLink}
              >
                <strong className={sharedStyles.cardTitle}>{article.sourceUrl}</strong>
                <span className={sharedStyles.muted}>{dictionary.openChannel}</span>
              </a>
            </article>
          ) : null}

          <article className={`${sharedStyles.panel} ${styles.sidebarPanel}`}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
                <h2 className={sharedStyles.cardTitle}>{dictionary.newsRelatedMatches}</h2>
              </div>
            </div>

            {article.entities.fixtures.length ? (
              <div className={sharedStyles.compactList}>
                {article.entities.fixtures.map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
                ))}
              </div>
            ) : (
              <div className={sharedStyles.emptyState}>{dictionary.newsNoRelatedMatches}</div>
            )}
          </article>

          <article className={`${sharedStyles.panel} ${styles.sidebarPanel}`}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
                <h2 className={sharedStyles.cardTitle}>{dictionary.newsRelatedTeams}</h2>
              </div>
            </div>

            {article.entities.teams.length ? (
              <div className={styles.relatedList}>
                {article.entities.teams.map((team) => (
                  <Link key={team.id} href={`/${locale}/teams/${team.id}`} className={styles.inlineLink}>
                    <strong className={sharedStyles.cardTitle}>{team.name}</strong>
                    <span className={sharedStyles.muted}>{team.league?.name || dictionary.teams}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={sharedStyles.emptyState}>{dictionary.newsNoRelatedTeams}</div>
            )}
          </article>

          <article className={`${sharedStyles.panel} ${styles.sidebarPanel}`}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
                <h2 className={sharedStyles.cardTitle}>{dictionary.newsRelatedCompetitions}</h2>
              </div>
            </div>

            {article.entities.competitions.length ? (
              <div className={styles.relatedList}>
                {article.entities.competitions.map((competition) => (
                  <Link
                    key={competition.id}
                    href={`/${locale}/leagues/${competition.code}`}
                    className={styles.inlineLink}
                  >
                    <strong className={sharedStyles.cardTitle}>{competition.name}</strong>
                    <span className={sharedStyles.muted}>
                      {competition.shortName || dictionary.competition}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={sharedStyles.emptyState}>
                {dictionary.newsNoRelatedCompetitions}
              </div>
            )}
          </article>
        </aside>
      </div>

      <section className={sharedStyles.section}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
            <h2 className={sharedStyles.sectionTitle}>{dictionary.newsRelatedStories}</h2>
          </div>
        </div>

        {relatedArticles.length ? (
          <div className={sharedStyles.grid}>
            {relatedArticles.map((relatedArticle) => (
              <NewsCard key={relatedArticle.id} article={relatedArticle} locale={locale} compact />
            ))}
          </div>
        ) : (
          <div className={sharedStyles.emptyState}>{dictionary.newsEmpty}</div>
        )}
      </section>
      </NewsEngagementTracker>
    </section>
  );
}
