import Link from "next/link";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import { notFound } from "next/navigation";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { NewsModule } from "../../../../components/coreui/news-module";
import styles from "../../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getSportNewsModule } from "../../../../lib/coreui/news-read";
import { getSportHub } from "../../../../lib/coreui/read";
import {
  getPersonalizationSnapshot,
  sortCompetitionsByPersonalization,
  sortFixturesByPersonalization,
} from "../../../../lib/personalization";
import {
  buildCompetitionHref,
  buildCountryHref,
} from "../../../../lib/coreui/routes";

export async function generateMetadata({ params }) {
  const { locale, sportSlug } = await params;
  const sportHub = await getSportHub(sportSlug);
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    sportHub?.sport?.name || dictionary.metaSportFallbackTitle,
    sportHub
      ? formatDictionaryText(dictionary.metaSportDescription, {
          name: sportHub.sport.name,
        })
      : dictionary.metaSportFallbackDescription,
    `/sports/${sportSlug}`
  );
}

export default async function SportHubPage({ params }) {
  const { locale, sportSlug } = await params;
  const dictionary = getDictionary(locale);
  const [sportHub, flags, personalization] = await Promise.all([
    getSportHub(sportSlug),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);

  if (!sportHub) {
    notFound();
  }

  const sportNews = flags.news
    ? await getSportNewsModule(sportHub.sport.id, 4)
    : { articles: [], total: 0 };
  const prioritizedCompetitions = sortCompetitionsByPersonalization(
    sportHub.competitions,
    personalization,
    (left, right) => left.name.localeCompare(right.name)
  );
  const prioritizedFixtures = sortFixturesByPersonalization(
    sportHub.fixtures,
    personalization,
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );

  return (
    <section className={styles.section}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{dictionary.sports}</p>
          <h1 className={styles.pageTitle}>{sportHub.sport.name}</h1>
          <p className={styles.pageLead}>
            {formatDictionaryText(dictionary.metaSportDescription, {
              name: sportHub.sport.name,
            })}
          </p>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{sportHub.competitions.length}</span>
          <span className={styles.badge}>{sportHub.fixtureSummary.LIVE}</span>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{sportHub.countries.length}</strong>
          <p className={styles.muted}>{dictionary.countries}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{sportHub.competitions.length}</strong>
          <p className={styles.muted}>{dictionary.leagues}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{sportHub.fixtureSummary.LIVE}</strong>
          <p className={styles.muted}>{dictionary.liveNow}</p>
        </article>
        <article className={styles.panel}>
          <strong className={styles.summaryValue}>{sportHub.fixtureSummary.SCHEDULED}</strong>
          <p className={styles.muted}>{dictionary.upcoming}</p>
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.countries}</p>
            <h2 className={styles.sectionTitle}>{dictionary.countries}</h2>
          </div>
          <span className={styles.badge}>{sportHub.countries.length}</span>
        </div>

        <div className={styles.leagueGrid}>
          {sportHub.countries.map((country) => (
            <article key={country.slug || country.code || country.name} className={styles.leagueCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <Link href={buildCountryHref(locale, country, sportHub.sport)}>{country.name}</Link>
                  </h3>
                  <p className={styles.muted}>
                    {country.competitionCount} {dictionary.leagues.toLowerCase()}
                  </p>
                </div>
                <span className={styles.badge}>{country.teamCount}</span>
              </div>

              <div className={styles.inlineBadgeRow}>
                <span className={styles.badge}>{dictionary.live}: {country.liveCount}</span>
                <span className={styles.badge}>{dictionary.fixtures}: {country.scheduledCount}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

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
                  <p className={styles.eyebrow}>{competition.country || dictionary.international}</p>
                  <h3 className={styles.cardTitle}>
                    <Link href={buildCompetitionHref(locale, competition)}>{competition.name}</Link>
                  </h3>
                </div>
                <div className={styles.inlineBadgeRow}>
                  <span className={styles.badge}>{competition.teamCount}</span>
                  <FavoriteToggle
                    itemId={`competition:${competition.code}`}
                    locale={locale}
                    compact
                    label={competition.name}
                    metadata={{
                      country: competition.country || null,
                    }}
                    surface="sport-hub"
                  />
                </div>
              </div>

              <div className={styles.inlineBadgeRow}>
                {competition.currentSeason ? (
                  <span className={styles.badge}>{competition.currentSeason}</span>
                ) : null}
                <span className={styles.badge}>{competition.fixtureSummary.LIVE}</span>
                <span className={styles.badge}>{competition.fixtureSummary.SCHEDULED}</span>
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
          articles={sportNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
        />
      ) : null}
    </section>
  );
}
