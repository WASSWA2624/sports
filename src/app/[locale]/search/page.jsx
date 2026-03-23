import { SearchAnalyticsTracker } from "../../../components/coreui/search-analytics-tracker";
import { SearchResultsSection } from "../../../components/coreui/search-results";
import { StructuredData } from "../../../components/coreui/structured-data";
import {
  RecentItemsPanel,
  TopCompetitionsPanel,
} from "../../../components/coreui/discovery-panels";
import styles from "../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../lib/coreui/dictionaries";
import {
  buildBreadcrumbStructuredData,
  buildCollectionPageStructuredData,
  buildPageMetadata,
} from "../../../lib/coreui/metadata";
import {
  getRecentItemsModule,
  getTopCompetitionsModule,
} from "../../../lib/coreui/discovery";
import { normalizeSearchQuery, searchGlobal } from "../../../lib/coreui/search";
import {
  getPersonalizationSnapshot,
} from "../../../lib/personalization";

export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const queryParams = await searchParams;
  const dictionary = getDictionary(locale);
  const query = normalizeSearchQuery(queryParams?.q || "");

  return buildPageMetadata(
    locale,
    query ? formatDictionaryText(dictionary.searchMetaTitle, { query }) : dictionary.search,
    query
      ? formatDictionaryText(dictionary.searchMetaDescription, { query })
      : dictionary.searchMetaDescriptionEmpty,
    "/search",
    {
      noIndex: true,
      keywords: [query, dictionary.search, dictionary.teams, dictionary.leagues].filter(Boolean),
    }
  );
}

export default async function SearchPage({ params, searchParams }) {
  const { locale } = await params;
  const queryParams = await searchParams;
  const dictionary = getDictionary(locale);
  const query = normalizeSearchQuery(queryParams?.q || "");
  const personalization = await getPersonalizationSnapshot();
  const [results, topCompetitions, recentItems] = await Promise.all([
    query.length >= 2 ? searchGlobal(query, { locale, limitPerSection: 8 }) : Promise.resolve(null),
    getTopCompetitionsModule(),
    getRecentItemsModule(personalization, { locale }),
  ]);

  const structuredData = [
    buildBreadcrumbStructuredData([
      {
        name: dictionary.home,
        path: `/${locale}`,
      },
      {
        name: dictionary.search,
        path: `/${locale}/search`,
      },
    ]),
    buildCollectionPageStructuredData({
      path: `/${locale}/search`,
      name: query
        ? formatDictionaryText(dictionary.searchMetaTitle, { query })
        : dictionary.search,
      description: query
        ? formatDictionaryText(dictionary.searchMetaDescription, { query })
        : dictionary.searchMetaDescriptionEmpty,
      items: (results?.topResults || []).map((item) => ({
        name: item.title,
        path: item.href,
      })),
    }),
  ];

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

      {results?.query ? (
        <SearchAnalyticsTracker
          query={results.query}
          total={results.summary.total}
          counts={results.summary.counts}
        />
      ) : null}

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.search}</p>
          <h1 className={styles.pageTitle}>
            {query
              ? formatDictionaryText(dictionary.searchResultsTitle, { query })
              : dictionary.search}
          </h1>
          <p className={styles.pageLead}>
            {query
              ? formatDictionaryText(dictionary.searchResultsLead, {
                  total: results?.summary?.total || 0,
                })
              : dictionary.searchPageLead}
          </p>
        </div>
      </header>

      {query.length >= 2 ? (
        <>
          {results?.topResults?.length ? (
            <SearchResultsSection
              title={dictionary.searchTopResults}
              locale={locale}
              dictionary={dictionary}
              results={results.topResults}
              surface="search-page"
              query={results.query}
            />
          ) : (
            <div className={styles.emptyState}>{dictionary.searchNoResults}</div>
          )}

          {results?.sections?.competitions?.length ? (
            <SearchResultsSection
              title={dictionary.searchCompetitions}
              locale={locale}
              dictionary={dictionary}
              results={results.sections.competitions}
              surface="search-page"
              query={results.query}
            />
          ) : null}

          {results?.sections?.teams?.length ? (
            <SearchResultsSection
              title={dictionary.searchTeams}
              locale={locale}
              dictionary={dictionary}
              results={results.sections.teams}
              surface="search-page"
              query={results.query}
            />
          ) : null}

          {results?.sections?.matches?.length ? (
            <SearchResultsSection
              title={dictionary.searchMatches}
              locale={locale}
              dictionary={dictionary}
              results={results.sections.matches}
              surface="search-page"
              query={results.query}
            />
          ) : null}

          {results?.sections?.players?.length ? (
            <SearchResultsSection
              title={dictionary.searchPlayers}
              locale={locale}
              dictionary={dictionary}
              results={results.sections.players}
              surface="search-page"
              query={results.query}
            />
          ) : null}

          {results?.sections?.articles?.length ? (
            <SearchResultsSection
              title={dictionary.searchArticles}
              locale={locale}
              dictionary={dictionary}
              results={results.sections.articles}
              surface="search-page"
              query={results.query}
            />
          ) : null}
        </>
      ) : (
        <>
          <RecentItemsPanel dictionary={dictionary} items={recentItems} />
          <TopCompetitionsPanel
            locale={locale}
            dictionary={dictionary}
            competitions={topCompetitions}
          />
        </>
      )}
    </section>
  );
}
