import Link from "next/link";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import { notFound } from "next/navigation";
import { FixtureCard } from "../../../../components/coreui/fixture-card";
import { NewsModule } from "../../../../components/coreui/news-module";
import { StructuredData } from "../../../../components/coreui/structured-data";
import styles from "../../../../components/coreui/styles.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { getPublicSurfaceFlags } from "../../../../lib/coreui/feature-flags";
import { getNewsModuleExperience } from "../../../../lib/coreui/news-experience";
import {
  buildBreadcrumbStructuredData,
  buildCollectionPageStructuredData,
  buildPageMetadata,
} from "../../../../lib/coreui/metadata";
import { getSportNewsModule } from "../../../../lib/coreui/news-read";
import { getSportHub } from "../../../../lib/coreui/read";
import { SPORTS_STRIP } from "../../../../lib/coreui/config";
import {
  getPersonalizationSnapshot,
  sortCompetitionsByPersonalization,
  sortFixturesByPersonalization,
} from "../../../../lib/personalization";
import {
  buildCompetitionHref,
  buildCountryHref,
} from "../../../../lib/coreui/routes";

function buildCatalogSportHub(reference) {
  const normalized = String(reference || "").trim().toLowerCase();
  const sport = SPORTS_STRIP.find(
    (entry) => !["favorites", "more"].includes(entry.key) && entry.key === normalized
  );

  if (!sport) {
    return null;
  }

  return {
    sport: {
      id: null,
      code: sport.key,
      slug: sport.key,
      name: sport.label,
    },
    countries: [],
    competitions: [],
    fixtures: [],
    fixtureSummary: {
      total: 0,
      LIVE: 0,
      SCHEDULED: 0,
      FINISHED: 0,
      POSTPONED: 0,
      CANCELLED: 0,
    },
  };
}

export async function generateMetadata({ params }) {
  const { locale, sportSlug } = await params;
  const sportHub = (await getSportHub(sportSlug)) || buildCatalogSportHub(sportSlug);
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    sportHub?.sport?.name || dictionary.metaSportFallbackTitle,
    sportHub
      ? formatDictionaryText(dictionary.metaSportDescription, {
          name: sportHub.sport.name,
        })
      : dictionary.metaSportFallbackDescription,
    `/sports/${sportSlug}`,
    {
      keywords: [sportHub?.sport?.name, dictionary.leagues, dictionary.teams].filter(Boolean),
    }
  );
}

export default async function SportHubPage({ params }) {
  const { locale, sportSlug } = await params;
  const dictionary = getDictionary(locale);
  const [sportHubRaw, flags, personalization] = await Promise.all([
    getSportHub(sportSlug),
    getPublicSurfaceFlags(),
    getPersonalizationSnapshot(),
  ]);
  const sportHub = sportHubRaw || buildCatalogSportHub(sportSlug);

  if (!sportHub) {
    notFound();
  }

  const sportNews = flags.news && sportHub.sport.id
    ? await getSportNewsModule(sportHub.sport.id, 4)
    : { articles: [], total: 0 };
  const sportNewsExperience = flags.news
    ? await getNewsModuleExperience({
        locale,
        articles: sportNews.articles,
        entityContext: {
          entityType: "sport",
          entityId: sportHub.sport.id || sportHub.sport.code,
        },
      })
    : { promo: null };
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
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: dictionary.home, path: `/${locale}` },
      { name: sportHub.sport.name, path: `/${locale}/sports/${sportHub.sport.slug}` },
    ]),
    buildCollectionPageStructuredData({
      path: `/${locale}/sports/${sportHub.sport.slug}`,
      name: sportHub.sport.name,
      description: formatDictionaryText(dictionary.metaSportDescription, {
        name: sportHub.sport.name,
      }),
      items: prioritizedCompetitions.slice(0, 8).map((competition) => ({
        name: competition.name,
        path: buildCompetitionHref(locale, competition),
      })),
      about: {
        "@type": "Thing",
        name: sportHub.sport.name,
      },
    }),
  ];

  return (
    <section className={styles.section}>
      <StructuredData data={structuredData} />

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

        {sportHub.countries.length ? (
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
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.leagues}</p>
            <h2 className={styles.sectionTitle}>{dictionary.leagues}</h2>
          </div>
          <span className={styles.badge}>{prioritizedCompetitions.length}</span>
        </div>

        {prioritizedCompetitions.length ? (
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
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
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
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                locale={locale}
                showAlerts
                alertSupportedTypes={["KICKOFF", "GOAL", "CARD", "PERIOD_CHANGE", "FINAL_RESULT", "NEWS"]}
                surface="sport-hub"
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      {flags.news ? (
        <NewsModule
          locale={locale}
          dictionary={dictionary}
          eyebrow={dictionary.news}
          title={dictionary.news}
          lead={dictionary.newsLead}
          articles={sportNews.articles}
          href="/news"
          actionLabel={dictionary.browseAll}
          emptyLabel={dictionary.newsEmpty}
          trackingSurface="sport-news-module"
          promo={sportNewsExperience.promo}
        />
      ) : null}
    </section>
  );
}
