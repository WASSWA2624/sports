import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchRow } from "../../../../components/coreui/scoreboard";
import boardStyles from "../../../../components/coreui/scoreboard.module.css";
import styles from "../../../../components/coreui/competition-pages.module.css";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getLeagueDetail } from "../../../../lib/coreui/match-data";

const META_SEPARATOR = " \u00b7 ";

function buildGroupedFixtures(fixtures) {
  return fixtures.reduce((groups, fixture) => {
    const key = fixture.round || new Date(fixture.startsAt).toISOString().slice(0, 10);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: fixture.round || new Intl.DateTimeFormat("en", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(new Date(fixture.startsAt)),
        fixtures: [],
      });
    }

    groups.get(key).fixtures.push(fixture);
    return groups;
  }, new Map());
}

function filterFixtures(fixtures, view) {
  if (view === "live") {
    return fixtures.filter((fixture) => fixture.status === "LIVE");
  }

  if (view === "scheduled") {
    return fixtures.filter((fixture) => fixture.status === "SCHEDULED");
  }

  if (view === "finished") {
    return fixtures.filter((fixture) => fixture.status === "FINISHED");
  }

  return fixtures;
}

export async function generateMetadata({ params }) {
  const { locale, leagueCode } = await params;
  const league = getLeagueDetail(leagueCode);

  return buildPageMetadata(
    locale,
    league?.name || "League",
    league ? `Fixtures and results for ${league.name}.` : "Football competition page.",
    `/leagues/${leagueCode}`
  );
}

export default async function LeagueDetailPage({ params, searchParams }) {
  const { locale, leagueCode } = await params;
  const filters = await searchParams;
  const league = getLeagueDetail(leagueCode);

  if (!league) {
    notFound();
  }

  const view = ["all", "live", "scheduled", "finished"].includes(String(filters?.view || "all"))
    ? String(filters?.view || "all")
    : "all";
  const fixtures = filterFixtures(league.fixtures, view);
  const grouped = [...buildGroupedFixtures(fixtures).values()];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className={styles.chipRow}>
            <span className={styles.badge}>{league.country}</span>
            <span className={styles.badge}>{league.season}</span>
            <span className={styles.badge}>{league.fixtures.length} matches</span>
          </div>
          <p className={styles.eyebrow}>League</p>
          <h1 className={styles.title}>{league.name}</h1>
        </div>
        <div className={styles.sectionTools}>
          <span className={styles.badge}>{league.fixtureSummary.LIVE} live</span>
          <span className={styles.badge}>{league.fixtureSummary.SCHEDULED} fixtures</span>
          <span className={styles.badge}>{league.fixtureSummary.FINISHED} results</span>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.chipRow}>
          {[
            { key: "all", label: "All" },
            { key: "live", label: "Live" },
            { key: "scheduled", label: "Fixtures" },
            { key: "finished", label: "Results" },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/${locale}/leagues/${league.code}${item.key === "all" ? "" : `?view=${item.key}`}`}
              className={item.key === view ? styles.tabChipActive : styles.tabChip}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {grouped.length ? (
        <div className={styles.fixtureGroups}>
          {grouped.map((group) => {
            const groupMeta = [league.country, `${group.fixtures.length} matches`].join(META_SEPARATOR);

            return (
              <section key={group.key} className={boardStyles.groupCard}>
                <div className={boardStyles.groupHeader}>
                  <h2 className={boardStyles.groupTitle}>{group.label}</h2>
                  <p className={boardStyles.groupMeta}>{groupMeta}</p>
                </div>
                <div className={boardStyles.matchList}>
                  {group.fixtures.map((fixture) => (
                    <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>No matches match this competition view right now.</div>
      )}
    </section>
  );
}
