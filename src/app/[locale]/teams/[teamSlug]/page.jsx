import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchRow } from "../../../../components/coreui/scoreboard";
import styles from "../../../../components/coreui/team-detail.module.css";
import { getDictionary, formatDictionaryText } from "../../../../lib/coreui/dictionaries";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getTeamDetailFromProvider } from "../../../../lib/coreui/sports-data";

function buildTeamLead(team) {
  const liveCount = team.fixtureSummary.LIVE || 0;
  const scheduledCount = team.fixtureSummary.SCHEDULED || 0;
  const competitionLabel =
    team.leagues.length === 1 ? team.leagues[0].name : `${team.leagues.length} competitions`;
  const activityLabel =
    liveCount || scheduledCount
      ? `${liveCount} live and ${scheduledCount} upcoming matches`
      : `${team.record.played} completed matches in the current snapshot`;

  return `${team.country || "Club"} side active in ${competitionLabel}, with ${activityLabel}.`;
}

function getFormChipClassName(result) {
  if (result === "W") {
    return styles.formChipWin;
  }

  if (result === "L") {
    return styles.formChipLoss;
  }

  return styles.formChipDraw;
}

export async function generateMetadata({ params }) {
  const { locale, teamSlug } = await params;
  const dictionary = getDictionary(locale);
  const team = await getTeamDetailFromProvider(teamSlug);

  return buildPageMetadata(
    locale,
    team?.name || dictionary.metaTeamFallbackTitle,
    team
      ? formatDictionaryText(dictionary.metaTeamDescription, { name: team.name })
      : dictionary.metaTeamFallbackDescription,
    `/teams/${teamSlug}`
  );
}

export default async function TeamDetailPage({ params }) {
  const { locale, teamSlug } = await params;
  const dictionary = getDictionary(locale);
  const team = await getTeamDetailFromProvider(teamSlug);

  if (!team) {
    notFound();
  }

  const summaryCards = [
    {
      key: "record",
      label: "Record",
      value: `${team.record.wins}-${team.record.draws}-${team.record.losses}`,
      meta: team.record.played ? `${team.record.played} finished matches` : "No finished matches yet",
    },
    {
      key: "goals",
      label: "Goals",
      value: `${team.record.goalsFor}:${team.record.goalsAgainst}`,
      meta: `${team.record.cleanSheets} clean sheets`,
    },
    {
      key: "schedule",
      label: "Live & upcoming",
      value: `${team.activeFixtures.length}`,
      meta: `${team.fixtureSummary.LIVE || 0} live / ${team.fixtureSummary.SCHEDULED || 0} upcoming`,
    },
    {
      key: "base",
      label: "Home base",
      value: team.venue || "Venue pending",
      meta: team.leagues.map((league) => league.name).join(" | "),
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.chipRow}>
            {team.country ? <span className={styles.badge}>{team.country}</span> : null}
            <span className={styles.badge}>{team.fixtureSummary.total} matches</span>
            {team.leagues.map((league) => (
              <Link key={league.code} href={`/${locale}/leagues/${league.code}`} className={styles.badgeLink}>
                {league.name}
              </Link>
            ))}
          </div>

          <p className={styles.eyebrow}>{dictionary.teamProfile || "Team profile"}</p>
          <h1 className={styles.title}>{team.name}</h1>
          <p className={styles.lead}>{buildTeamLead(team)}</p>
        </div>

        {team.form.length ? (
          <div className={styles.formRail}>
            {team.form.map((entry) => (
              <span key={entry.fixtureId} className={getFormChipClassName(entry.result)}>
                {entry.result}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.key} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{card.label}</span>
            <strong className={styles.summaryValue}>{card.value}</strong>
            <p className={styles.summaryMeta}>{card.meta}</p>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Matchday</p>
            <h2 className={styles.sectionTitle}>Live & upcoming</h2>
          </div>
          <span className={styles.sectionCount}>{team.activeFixtures.length}</span>
        </div>

        {team.activeFixtures.length ? (
          <div className={styles.fixtureStack}>
            {team.activeFixtures.map((fixture) => (
              <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No live or upcoming fixtures are attached to this team right now.</div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Form</p>
            <h2 className={styles.sectionTitle}>Recent results</h2>
          </div>
          <span className={styles.sectionCount}>{team.recentResults.length}</span>
        </div>

        {team.recentResults.length ? (
          <div className={styles.fixtureStack}>
            {team.recentResults.map((fixture) => (
              <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Finished match snapshots will appear here as soon as they are available.</div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Competitions</p>
            <h2 className={styles.sectionTitle}>Active leagues</h2>
          </div>
          <span className={styles.sectionCount}>{team.leagues.length}</span>
        </div>

        <div className={styles.competitionGrid}>
          {team.leagues.map((league) => (
            <Link key={league.code} href={`/${locale}/leagues/${league.code}`} className={styles.competitionLink}>
              <p className={styles.eyebrow}>{league.country}</p>
              <h3>{league.name}</h3>
              <p className={styles.competitionMeta}>Open fixtures, results, and the competition board.</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Squad</p>
            <h2 className={styles.sectionTitle}>Recent lineup snapshot</h2>
          </div>
          <span className={styles.sectionCount}>{team.playerPreview.length}</span>
        </div>

        {team.playerPreview.length ? (
          <div className={styles.playerGrid}>
            {team.playerPreview.map((player) => (
              <article key={`${player.name}-${player.jerseyNumber}`} className={styles.playerCard}>
                <span className={styles.playerName}>{player.name}</span>
                <span className={styles.playerNumber}>#{player.jerseyNumber}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Lineup data has not been attached to this team yet.</div>
        )}
      </section>
    </section>
  );
}
