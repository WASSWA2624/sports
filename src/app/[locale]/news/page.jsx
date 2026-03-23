import Link from "next/link";
import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getCurrentUserFromServer } from "../../../lib/auth";
import { getPublicSurfaceFlags } from "../../../lib/coreui/feature-flags";
import { getNewsHubSnapshot } from "../../../lib/coreui/news-read";
import { NewsCard } from "../../../components/coreui/news-card";
import sharedStyles from "../../../components/coreui/styles.module.css";
import styles from "./news.module.css";

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
  const [flags, hub, userContext] = await Promise.all([
    getPublicSurfaceFlags(),
    getNewsHubSnapshot(),
    getCurrentUserFromServer(),
  ]);
  const canEdit = userContext?.roles?.some((role) => ["EDITOR", "ADMIN"].includes(role));

  if (!flags.news) {
    return (
      <section className={sharedStyles.section}>
        <header className={sharedStyles.pageHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
            <h1 className={sharedStyles.pageTitle}>{dictionary.news}</h1>
            <p className={sharedStyles.pageLead}>{dictionary.newsHubDisabled}</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className={sharedStyles.section}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
          <h1 className={sharedStyles.pageTitle}>{dictionary.news}</h1>
          <p className={sharedStyles.pageLead}>{dictionary.newsLead}</p>
        </div>
        {canEdit ? (
          <Link href={`/${locale}/news/manage`} className={sharedStyles.actionLink}>
            {dictionary.newsManage}
          </Link>
        ) : null}
      </header>

      {hub.hero ? (
        <section className={styles.hubHero}>
          <article className={`${sharedStyles.panel} ${styles.heroPanel}`}>
            <Link href={`/${locale}/news/${hub.hero.slug}`} className={styles.heroLink}>
              <div className={styles.heroVisual}>
                <span className={sharedStyles.badge}>{hub.hero.topicLabel}</span>
                <strong className={styles.heroTitle}>{hub.hero.title}</strong>
              </div>

              <div className={sharedStyles.section}>
                <div className={styles.storyMeta}>
                  <span>{formatPublishedAt(hub.hero.publishedAt, locale)}</span>
                  <span>{hub.hero.readingTimeMinutes} min read</span>
                  {hub.hero.primaryCompetition?.name ? (
                    <span>{hub.hero.primaryCompetition.name}</span>
                  ) : null}
                </div>
                <p className={sharedStyles.pageLead}>{hub.hero.excerpt}</p>
                <div className={styles.storyTags}>
                  {hub.hero.entities.teams.slice(0, 2).map((team) => (
                    <span key={team.id} className={sharedStyles.badge}>
                      {team.shortName || team.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </article>

          <article className={`${sharedStyles.panel} ${styles.latestPanel}`}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.newsLatest}</p>
                <h2 className={sharedStyles.sectionTitle}>{dictionary.newsTopStories}</h2>
              </div>
            </div>

            {hub.latest.length ? (
              <div className={styles.latestList}>
                {hub.latest.map((article) => (
                  <div key={article.id} className={styles.latestItem}>
                    <div className={styles.storyMeta}>
                      <span>{article.topicLabel}</span>
                      <span>{article.readingTimeMinutes} min read</span>
                    </div>
                    <Link href={`/${locale}/news/${article.slug}`} className={styles.latestLink}>
                      <strong className={sharedStyles.cardTitle}>{article.title}</strong>
                    </Link>
                    <p className={sharedStyles.muted}>{article.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={sharedStyles.emptyState}>{dictionary.newsEmpty}</div>
            )}
          </article>
        </section>
      ) : (
        <div className={sharedStyles.emptyState}>{dictionary.newsEmpty}</div>
      )}

      <section className={sharedStyles.section}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.sports}</p>
            <h2 className={sharedStyles.sectionTitle}>{dictionary.newsBySport}</h2>
            <p className={sharedStyles.sectionLead}>{dictionary.newsBySportLead}</p>
          </div>
        </div>

        {hub.sportGroups.length ? (
          <div className={sharedStyles.section}>
            {hub.sportGroups.map((group) => (
              <section key={group.key} className={sharedStyles.section}>
                <div className={sharedStyles.sectionHeader}>
                  <div>
                    <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
                    <h3 className={sharedStyles.sectionTitle}>{group.sport.name}</h3>
                  </div>
                  <span className={sharedStyles.badge}>{group.articles.length}</span>
                </div>

                <div className={sharedStyles.grid}>
                  {group.articles.map((article) => (
                    <NewsCard key={article.id} article={article} locale={locale} compact />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={sharedStyles.emptyState}>{dictionary.newsEmpty}</div>
        )}
      </section>

      <section className={sharedStyles.section}>
        <div className={sharedStyles.sectionHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.newsTopics}</p>
            <h2 className={sharedStyles.sectionTitle}>{dictionary.newsTopicGroups}</h2>
            <p className={sharedStyles.sectionLead}>{dictionary.newsTopicGroupsLead}</p>
          </div>
        </div>

        {hub.topicGroups.length ? (
          <div className={styles.topicGrid}>
            {hub.topicGroups.map((group) => (
              <article key={group.key} className={sharedStyles.panel}>
                <div className={sharedStyles.sectionHeader}>
                  <div>
                    <p className={sharedStyles.eyebrow}>{dictionary.newsTopics}</p>
                    <h3 className={sharedStyles.cardTitle}>{group.label}</h3>
                  </div>
                  <span className={sharedStyles.badge}>{group.articles.length}</span>
                </div>

                <div className={styles.relatedList}>
                  {group.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/${locale}/news/${article.slug}`}
                      className={styles.inlineLink}
                    >
                      <strong className={sharedStyles.cardTitle}>{article.title}</strong>
                      <span className={sharedStyles.muted}>{article.excerpt}</span>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={sharedStyles.emptyState}>{dictionary.newsEmpty}</div>
        )}
      </section>
    </section>
  );
}
