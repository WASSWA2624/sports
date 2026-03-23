import Link from "next/link";
import { buildPageMetadata } from "../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../lib/coreui/dictionaries";
import { getHomeSnapshot } from "../../lib/coreui/read";
import { FavoriteToggle } from "../../components/coreui/favorite-toggle";
import { FixtureFeedCard } from "../../components/coreui/fixture-feed-card";
import styles from "../../components/coreui/styles.module.css";

const STATUS_ORDER = {
  LIVE: 0,
  SCHEDULED: 1,
  FINISHED: 2,
  POSTPONED: 3,
  CANCELLED: 4,
};

function dedupeFixtures(fixtures) {
  return [...new Map(fixtures.map((fixture) => [fixture.id, fixture])).values()];
}

function compareFixtures(left, right) {
  const leftRank = STATUS_ORDER[left.status] ?? 99;
  const rightRank = STATUS_ORDER[right.status] ?? 99;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
}

function groupFixtures(fixtures) {
  return [...fixtures.reduce((accumulator, fixture) => {
    const key = fixture.league?.code || fixture.league?.id || fixture.id;

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        code: fixture.league?.code || null,
        name: fixture.league?.name || null,
        country: fixture.league?.country || null,
        fixtures: [],
      });
    }

    accumulator.get(key).fixtures.push(fixture);
    return accumulator;
  }, new Map()).values()];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(locale, dictionary.metaHomeTitle, dictionary.metaHomeDescription, "");
}

export default async function LocaleHomePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const snapshot = await getHomeSnapshot();
  const boardFixtures = dedupeFixtures([
    ...snapshot.liveFixtures,
    ...snapshot.upcomingFixtures,
    ...snapshot.recentResults,
  ]).sort(compareFixtures);
  const boardGroups = groupFixtures(boardFixtures);
  const boardDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).format(new Date());

  return (
    <>
      <section className={styles.noticeBanner}>
        <span className={styles.noticeLabel}>{dictionary.football}</span>
        <p>
          {formatDictionaryText(dictionary.homeNotice, {
            count: boardFixtures.length,
          })}
        </p>
      </section>

      <section className={styles.homeBoard}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.scores}</p>
            <h1 className={styles.pageTitle}>{dictionary.homeScoresTitle}</h1>
            <p className={styles.pageLead}>
              {formatDictionaryText(dictionary.homeScoresLead, {
                live: snapshot.liveFixtures.length,
                scheduled: snapshot.upcomingFixtures.length,
                finished: snapshot.recentResults.length,
              })}
            </p>
          </div>
          <div className={styles.sectionTools}>
            <span className={styles.badge}>{boardDate}</span>
            <Link href={`/${locale}/live`} className={styles.sectionAction}>
              {dictionary.openLiveBoard}
            </Link>
          </div>
        </header>

        <div className={styles.filterStack}>
          <div className={styles.filterRow}>
            <Link href={`/${locale}`} className={styles.filterChipActive}>
              All
              <span className={styles.filterCount}>{boardFixtures.length}</span>
            </Link>
            <Link href={`/${locale}/live`} className={styles.filterChip}>
              {dictionary.liveNow}
              <span className={styles.filterCount}>{snapshot.liveFixtures.length}</span>
            </Link>
            <Link href={`/${locale}/fixtures`} className={styles.filterChip}>
              {dictionary.upcoming}
              <span className={styles.filterCount}>{snapshot.upcomingFixtures.length}</span>
            </Link>
            <Link href={`/${locale}/results`} className={styles.filterChip}>
              {dictionary.recent}
              <span className={styles.filterCount}>{snapshot.recentResults.length}</span>
            </Link>
            <Link href={`/${locale}/tables`} className={styles.filterChip}>
              {dictionary.standings}
              <span className={styles.filterCount}>{snapshot.leagues.length}</span>
            </Link>
          </div>
        </div>

        {boardGroups.length ? (
          <div className={styles.section}>
            {boardGroups.map((group) => (
              <section key={group.key} className={styles.boardGroup}>
                <div className={styles.boardGroupSummary}>
                  <div>
                    <p className={styles.eyebrow}>{group.country || dictionary.international}</p>
                    <h2 className={styles.sectionTitle}>{group.name || dictionary.competition}</h2>
                  </div>
                  <div className={styles.inlineBadgeRow}>
                    <span className={styles.badge}>{group.fixtures.length}</span>
                    {group.code ? (
                      <FavoriteToggle itemId={`competition:${group.code}`} locale={locale} compact />
                    ) : null}
                  </div>
                </div>

                <div className={styles.fixtureGrid}>
                  {group.fixtures.map((fixture) => (
                    <FixtureFeedCard
                      key={fixture.id}
                      fixture={fixture}
                      locale={locale}
                      mode="live"
                      showLeague={false}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.noData}</div>
        )}
      </section>

      <div className={styles.homeSplit}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.standings}</h2>
            <Link href={`/${locale}/tables`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>

          <div className={styles.compactList}>
            {snapshot.leagues.map((league) => (
              <article key={league.id} className={styles.miniPanel}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{league.country || dictionary.international}</p>
                    <h3 className={styles.cardTitle}>
                      <Link href={`/${locale}/leagues/${league.code}`}>{league.name}</Link>
                    </h3>
                  </div>
                </div>

                <div className={styles.miniTable}>
                  {(league.seasons[0]?.standings || []).slice(0, 4).map((row) => (
                    <div key={row.id} className={styles.miniTableRow}>
                      <span>{row.position}</span>
                      <span>{row.team.name}</span>
                      <strong>{row.points}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{dictionary.recent}</h2>
            <Link href={`/${locale}/results`} className={styles.sectionAction}>
              {dictionary.browseAll}
            </Link>
          </div>

          <div className={styles.compactList}>
            {snapshot.recentResults.slice(0, 4).map((fixture) => (
              <FixtureFeedCard
                key={fixture.id}
                fixture={fixture}
                locale={locale}
                mode="results"
                showLeague
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
