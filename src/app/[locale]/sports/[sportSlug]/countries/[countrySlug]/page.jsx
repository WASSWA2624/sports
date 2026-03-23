import Link from "next/link";
import { FavoriteToggle } from "../../../../../../components/coreui/favorite-toggle";
import { notFound } from "next/navigation";
import { FixtureCard } from "../../../../../../components/coreui/fixture-card";
import { NewsModule } from "../../../../../../components/coreui/news-module";
import styles from "../../../../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../../../lib/coreui/feature-flags";
import { buildPageMetadata } from "../../../../../../lib/coreui/metadata";
import { getCountryNewsModule } from "../../../../../../lib/coreui/news-read";
import { getCountryDetail } from "../../../../../../lib/coreui/read";
import {
  getPersonalizationSnapshot,
  sortCompetitionsByPersonalization,
  sortFixturesByPersonalization,
} from "../../../../../../lib/personalization";
import {
  buildCompetitionHref,
  buildSportHref,
} from "../../../../../../lib/coreui/routes";

export async function generateMetadata({ params }) {
  const { locale, sportSlug, countrySlug } = await params;
  const countryDetail = await getCountryDetail(countrySlug, { sportReference: sportSlug });
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    countryDetail?.country?.name || dictionary.metaCountryFallbackTitle,
    countryDetail
      ? formatDictionaryText(dictionary.metaCountryDescription, {
          name: countryDetail.country.name,
          sport: countryDetail.sport.name,
        })
      : dictionary.metaCountryFallbackDescription,
    `/sports/${sportSlug}/countries/${countrySlug}`
  );
}

export default async function CountryHubPage({ params }) {
  const { locale, sportSlug, countrySlug } = await params;
  const dictionary = getDictionary(locale);
  const [countryDetail, flags, personalization] = await Promise.all([
    getCountryDetail(countrySlug, { sportReference: sportSlug }),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);

  if (!countryDetail) {
    notFound();
  }

  const countryNews = flags.news
    ? await getCountryNewsModule(countryDetail.country.id, 4)
    : { articles: [], total: 0 };
  const prioritizedCompetitions = sortCompetitionsByPersonalization(
    countryDetail.competitions,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const prioritizedFixtures = sortFixturesByPersonalization(
    countryDetail.fixtures,
    personalization,
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.linkList}>
            <Link href={buildSportHref(locale, countryDetail.sport)} className={styles.badge}>
              {countryDetail.sport.name}
            </Link>
            <span className={styles.badge}>{countryDetail.country.name}</span>
          </div>
          <h1 className={styles.pageTitle}>{countryDetail.country.name}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.metaCountryDescription, {
              name: countryDetail.country.name,
              sport: countryDetail.sport.name,
            })}
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{countryDetail.competitions.length}</span>
          <span className={styles.badge}>{countryDetail.fixtureSummary.LIVE}</span>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{countryDetail.competitions.length}</strong>
          <p className={styles.muted}>{dictionary.leagues}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{countryDetail.fixtureSummary.LIVE}</strong>
          <p className={styles.muted}>{dictionary.liveNow}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{countryDetail.fixtureSummary.SCHEDULED}</strong>
          <p className={styles.muted}>{dictionary.upcoming}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>
            {countryDetail.competitions.reduce((count, competition) => count + competition.teamCount, 0)}
          </strong>
          <p className={styles.muted}>{dictionary.teams}</p>
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.leagues}</p>
            <h2 className={styles.sectionTitle}>{dictionary.leagues}</h2>
          </div>
          <span className={styles.badge}>{prioritizedCompetitions.length}</span>
        </div>

        <div className={styles.leagueGrid}>
          {prioritizedCompetitions.map((competition) => (
            <article key={competition.code} className={styles.leagueCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <Link href={buildCompetitionHref(locale, competition)}>{competition.name}</Link>
                  </h3>
                  <p className={styles.muted}>{competition.currentSeason || dictionary.noData}</p>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={styles.badge}>{competition.teamCount}</span>
                  <FavoriteToggle
                    itemId={`competition:${competition.code}`}
                    locale={locale}
                    compact
                    label={competition.name}
                    metadata={{
                      country: countryDetail.country.name,
                    }}
                    surface="country-hub"
                  />
                </div>
              </div>

              <div className={styles.inlineBadgeRow}>
                <span className={styles.badge}>{dictionary.live}: {competition.fixtureSummary.LIVE}</span>
                <span className={styles.badge}>
                  {dictionary.results}: {competition.fixtureSummary.FINISHED}
                </span>
                <span className={styles.badge}>{dictionary.archive}: {competition.seasons.length}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.overview}</p>
            <h2 className={styles.sectionTitle}>{dictionary.fixtures}</h2>
          </div>
          <span className={styles.badge}>{prioritizedFixtures.length}</span>
        </div>

        {prioritizedFixtures.length ? (
          <div className={styles.fixtureGrid}>
            {prioritizedFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      {flags.news ? (
        <NewsModule
          locale={locale}
          eyebrow={dictionary.news}
          title={dictionary.news}
          lead={dictionary.newsLead}
          articles={countryNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
        />
      ) : null}
    </section>
  );
}
