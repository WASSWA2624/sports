import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRefresh } from "../../../../components/coreui/live-refresh";
import styles from "../../../../components/coreui/match-detail.module.css";
import {
  getMatchByReferenceFromProvider,
} from "../../../../lib/coreui/sports-data";
import { buildMatchStatusLabel, buildMatchTimeLabel } from "../../../../lib/coreui/sports-formatters";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { buildTeamHref } from "../../../../lib/coreui/routes";

function scoreline(fixture) {
  if (!Number.isFinite(fixture.resultSnapshot?.homeScore)) {
    return "vs";
  }

  return `${fixture.resultSnapshot.homeScore} - ${fixture.resultSnapshot.awayScore}`;
}

function getRefreshUntil(fixture) {
  return new Date(new Date(fixture.startsAt).getTime() + 3 * 60 * 60 * 1000).toISOString();
}

export async function generateMetadata({ params }) {
  const { locale, fixtureRef } = await params;
  const fixture = await getMatchByReferenceFromProvider(fixtureRef);

  return buildPageMetadata(
    locale,
    fixture ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}` : "Match",
    fixture
      ? `Live score, kickoff time, and result details for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}.`
      : "Football match details.",
    `/match/${fixtureRef}`
  );
}

export default async function MatchDetailPage({ params }) {
  const { locale, fixtureRef } = await params;
  const fixture = await getMatchByReferenceFromProvider(fixtureRef);

  if (!fixture) {
    notFound();
  }

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={fixture.status === "LIVE"}
        intervalMs={fixture.status === "LIVE" ? 30000 : 0}
        until={fixture.status === "LIVE" ? getRefreshUntil(fixture) : null}
      />

      <header className={styles.hero}>
        <div className={styles.topline}>
          <Link href={`/${locale}/leagues/${fixture.league.code}`} className={styles.backLink}>
            {fixture.league.name}
          </Link>
          <span className={fixture.status === "LIVE" ? styles.statusLive : styles.statusDefault}>
            {buildMatchStatusLabel(fixture, locale)}
          </span>
          <span className={styles.badge}>{buildMatchTimeLabel(fixture, locale)}</span>
          {fixture.venue ? <span className={styles.badge}>{fixture.venue}</span> : null}
        </div>

        <h1 className={styles.title}>{fixture.homeTeam.name} vs {fixture.awayTeam.name}</h1>

        <div className={styles.scoreline}>
          <Link href={buildTeamHref(locale, fixture.homeTeam)} className={styles.teamCard}>
            <span>Home</span>
            <strong>{fixture.homeTeam.name}</strong>
          </Link>

          <div className={styles.centerScore}>
            <strong className={styles.scoreValue}>{scoreline(fixture)}</strong>
            <div className={styles.scoreMeta}>
              <span className={styles.badge}>{fixture.league.country}</span>
              {fixture.referee ? <span className={styles.badge}>{fixture.referee}</span> : null}
            </div>
          </div>

          <Link href={buildTeamHref(locale, fixture.awayTeam)} className={styles.teamCard}>
            <span>Away</span>
            <strong>{fixture.awayTeam.name}</strong>
          </Link>
        </div>
      </header>

      <section className={`${styles.panel} ${styles.timelinePanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Timeline</p>
            <h2 className={styles.sectionTitle}>Events</h2>
          </div>
          <span className={styles.badge}>{fixture.timeline.length}</span>
        </div>

        {fixture.timeline.length ? (
          <div className={styles.timeline}>
            {fixture.timeline.map((event) => (
              <article key={event.id} className={styles.timelineItem}>
                <strong className={styles.minute}>{event.minuteLabel}</strong>
                <div>
                  <h3 className={styles.timelineTitle}>{event.title}</h3>
                  {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                  <p className={styles.muted}>{event.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No event details are available for this match yet.</div>
        )}
      </section>

      <section className={`${styles.panel} ${styles.statsPanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Stats</p>
            <h2 className={styles.sectionTitle}>Statistics</h2>
          </div>
          <span className={styles.badge}>{fixture.statistics.length}</span>
        </div>

        {fixture.statistics.length ? (
          <div className={styles.stats}>
            {fixture.statistics.map((entry) => (
              <div key={entry.key} className={styles.statRow}>
                <strong className={styles.statValue}>{entry.home}</strong>
                <span className={styles.statLabel}>{entry.label}</span>
                <div className={styles.statTrack}>
                  <span className={styles.statHome} style={{ width: `${entry.homeShare}%` }} />
                  <span className={styles.statAway} style={{ width: `${entry.awayShare}%` }} />
                </div>
                <strong className={styles.statValue}>{entry.away}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No statistics are available for this match yet.</div>
        )}
      </section>

      <section className={`${styles.panel} ${styles.lineupsPanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Lineups</p>
            <h2 className={styles.sectionTitle}>Starting elevens</h2>
          </div>
        </div>

        {fixture.lineups?.home?.starters?.length || fixture.lineups?.away?.starters?.length ? (
          <div className={styles.lineupGrid}>
            {[
              { key: "home", teamName: fixture.homeTeam.name, lineup: fixture.lineups.home },
              { key: "away", teamName: fixture.awayTeam.name, lineup: fixture.lineups.away },
            ].map((entry) => (
              <article key={entry.key} className={styles.lineupCard}>
                <p className={styles.eyebrow}>{entry.teamName}</p>
                <h3 className={styles.timelineTitle}>
                  {entry.lineup.formation ? `Formation ${entry.lineup.formation}` : "Projected lineup"}
                </h3>
                <div>
                  {entry.lineup.starters.length ? (
                    entry.lineup.starters.map((player) => (
                      <div key={player.id} className={styles.lineupRow}>
                        <span>{player.name}</span>
                        <span className={styles.muted}>#{player.jerseyNumber}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>Lineup not confirmed yet.</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Lineups have not been listed for this match yet.</div>
        )}
      </section>
    </section>
  );
}
