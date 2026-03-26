import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchRow } from "../../../../components/coreui/scoreboard";
import boardStyles from "../../../../components/coreui/scoreboard.module.css";
import styles from "../../../../components/coreui/competition-pages.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { formatMatchday } from "../../../../lib/coreui/format";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getLeagueDetail, getLeagueMetadataSummary } from "../../../../lib/coreui/read";

const TERMINAL_STATUSES = new Set(["FINISHED", "POSTPONED", "CANCELLED"]);
const VALID_VIEWS = new Set(["all", "live", "scheduled", "finished", "archive"]);

function normalizeView(value) {
  const normalized = String(value || "all").toLowerCase();
  return VALID_VIEWS.has(normalized) ? normalized : "all";
}

function buildLeagueHref(locale, leagueCode, { view, season } = {}) {
  const params = new URLSearchParams();

  if (view && view !== "all") {
    params.set("view", view);
  }

  if (season) {
    params.set("season", season);
  }

  const query = params.toString();
  return `/${locale}/leagues/${leagueCode}${query ? `?${query}` : ""}`;
}

function groupFixtures(fixtures, locale) {
  const groups = fixtures.reduce((accumulator, fixture) => {
    const key = fixture.round || new Date(fixture.startsAt).toISOString().slice(0, 10);
    const label = fixture.round || formatMatchday(fixture.startsAt, locale);

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        label,
        fixtures: [],
      });
    }

    accumulator.get(key).fixtures.push(fixture);
    return accumulator;
  }, new Map());

  return [...groups.values()];
}

function filterFixtures(fixtures, view) {
  if (view === "live") {
    return fixtures.filter((fixture) => fixture.status === "LIVE");
  }

  if (view === "scheduled") {
    return fixtures.filter((fixture) => fixture.status === "SCHEDULED");
  }

  if (view === "finished") {
    return fixtures.filter((fixture) => TERMINAL_STATUSES.has(fixture.status));
  }

  return fixtures;
}

export async function generateMetadata({ params }) {
  const { locale, leagueCode } = await params;
  const dictionary = getDictionary(locale);
  const league = await getLeagueMetadataSummary(leagueCode);

  if (!league) {
    return buildPageMetadata(
      locale,
      dictionary.metaLeagueFallbackTitle,
      dictionary.metaLeagueFallbackDescription,
      `/leagues/${leagueCode}`
    );
  }

  return buildPageMetadata(
    locale,
    league.name,
    formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name }),
    `/leagues/${leagueCode}`
  );
}

export default async function LeagueDetailPage({ params, searchParams }) {
  const { locale, leagueCode } = await params;
  const filters = await searchParams;
  const dictionary = getDictionary(locale);
  const activeView = normalizeView(filters?.view);
  const league = await getLeagueDetail(leagueCode, {
    locale,
    seasonRef: filters?.season,
  });

  if (!league) {
    notFound();
  }

  const selectedSeasonRef =
    league.selectedSeason?.externalRef || league.selectedSeason?.id || league.selectedSeason?.name;
  const visibleFixtures = filterFixtures(league.seasonFixtures, activeView);
  const groupedFixtures = groupFixtures(visibleFixtures, locale);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className={styles.chipRow}>
            <span className={styles.badge}>{league.country || dictionary.international}</span>
            {league.selectedSeason ? <span className={styles.badge}>{league.selectedSeason.name}</span> : null}
            <span className={styles.badge}>{league.fixtureSummary.total} matches</span>
          </div>
          <p className={styles.eyebrow}>Competition</p>
          <h1 className={styles.title}>{league.name}</h1>
          <p className={styles.lead}>
            {formatDictionaryText(dictionary.metaLeagueDescription, { name: league.name })}
          </p>
        </div>

        <div className={styles.sectionTools}>
          <span className={styles.badge}>{league.fixtureSummary.LIVE} live</span>
          <span className={styles.badge}>{league.fixtureSummary.SCHEDULED} scheduled</span>
          <span className={styles.badge}>{league.fixtureSummary.FINISHED} finished</span>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>View</p>
            <h2 className={styles.sectionTitle}>Fixtures and results</h2>
          </div>
        </div>

        <div className={styles.chipRow}>
          {[
            { key: "all", label: "All" },
            { key: "live", label: "Live" },
            { key: "scheduled", label: "Scheduled" },
            { key: "finished", label: "Finished" },
            { key: "archive", label: "Archive" },
          ].map((item) => (
            <Link
              key={item.key}
              href={buildLeagueHref(locale, league.code, {
                view: item.key,
                season: selectedSeasonRef,
              })}
              className={item.key === activeView ? styles.tabChipActive : styles.tabChip}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {league.seasons.length ? (
          <div className={styles.seasonRail}>
            {league.seasons.map((season) => {
              const seasonReference = season.externalRef || season.id || season.name;

              return (
                <Link
                  key={season.id}
                  href={buildLeagueHref(locale, league.code, {
                    view: activeView,
                    season: seasonReference,
                  })}
                  className={
                    seasonReference === selectedSeasonRef ? styles.seasonChipActive : styles.seasonChip
                  }
                >
                  {season.name}
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      {league.degraded ? (
        <div className={styles.emptyState}>League data is degraded. Showing the latest stored football snapshot.</div>
      ) : null}

      {activeView === "archive" ? (
        league.archiveSeasons.length ? (
          <div className={styles.archiveGrid}>
            {league.archiveSeasons.map((season) => {
              const seasonReference = season.externalRef || season.id || season.name;

              return (
                <article key={season.id} className={styles.seasonCard}>
                  <p className={styles.eyebrow}>Season</p>
                  <h2 className={styles.cardTitle}>{season.name}</h2>
                  <p className={styles.cardMeta}>
                    {season.fixtureCount} matches • {season.standingCount} standings rows
                  </p>
                  <div className={styles.chipRow}>
                    <Link
                      href={buildLeagueHref(locale, league.code, {
                        season: seasonReference,
                      })}
                      className={styles.sectionAction}
                    >
                      Open season
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>No archived football seasons are available for this competition yet.</div>
        )
      ) : groupedFixtures.length ? (
        groupedFixtures.map((group) => (
          <section key={group.key} className={boardStyles.groupCard}>
            <div className={boardStyles.groupHeader}>
              <div>
                <p className={boardStyles.groupCountry}>{league.country || dictionary.international}</p>
                <h2 className={boardStyles.groupTitle}>{group.label}</h2>
              </div>
              <div className={boardStyles.groupSummary}>
                <span>{group.fixtures.length} matches</span>
              </div>
            </div>

            <div className={boardStyles.matchList}>
              {group.fixtures.map((fixture) => (
                <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className={styles.emptyState}>No football fixtures match this competition view yet.</div>
      )}
    </section>
  );
}
