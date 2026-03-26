import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRefresh } from "../../../../components/coreui/live-refresh";
import styles from "../../../../components/coreui/match-detail.module.css";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import { formatFixtureStatus, formatKickoff, formatSnapshotTime } from "../../../../lib/coreui/format";
import {
  buildFixtureRefereeSummary,
  buildFixtureVenueSummary,
  getLiveMatchDetail,
} from "../../../../lib/coreui/live-read";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { buildCompetitionHref } from "../../../../lib/coreui/routes";

function isScoreAvailable(snapshot) {
  return Number.isFinite(snapshot?.homeScore) && Number.isFinite(snapshot?.awayScore);
}

function statusClass(status) {
  return status === "LIVE" ? styles.statusLive : styles.statusDefault;
}

export async function generateMetadata({ params }) {
  const { locale, fixtureRef } = await params;
  const dictionary = getDictionary(locale);
  const fixture = await getLiveMatchDetail(fixtureRef, locale, undefined, {
    includeMatchCentre: false,
    includeExperience: false,
  });

  if (!fixture) {
    return buildPageMetadata(
      locale,
      dictionary.metaMatchFallbackTitle,
      dictionary.metaMatchFallbackDescription,
      `/match/${fixtureRef}`
    );
  }

  return buildPageMetadata(
    locale,
    `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
    formatDictionaryText(dictionary.metaMatchDescription, {
      home: fixture.homeTeam.name,
      away: fixture.awayTeam.name,
    }),
    `/match/${fixtureRef}`
  );
}

export default async function MatchDetailPage({ params }) {
  const { locale, fixtureRef } = await params;
  const dictionary = getDictionary(locale);
  const fixture = await getLiveMatchDetail(fixtureRef, locale, undefined, {
    includeMatchCentre: false,
    includeExperience: false,
  });

  if (!fixture) {
    notFound();
  }

  const venue = buildFixtureVenueSummary(fixture);
  const referee = buildFixtureRefereeSummary(fixture.participants);
  const competitionHref = fixture.league?.code ? buildCompetitionHref(locale, fixture.league) : null;
  const scoreAvailable = isScoreAvailable(fixture.resultSnapshot);
  const displayStatus = fixture.detail.liveState.minuteLabel || formatFixtureStatus(fixture.status, locale);

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={fixture.detail.refresh.enabled}
        intervalMs={fixture.detail.refresh.intervalMs}
        until={fixture.detail.refresh.until}
      />

      <header className={styles.hero}>
        <div className={styles.topline}>
          {competitionHref ? (
            <Link href={competitionHref} className={styles.backLink}>
              {fixture.league.name}
            </Link>
          ) : null}
          <span className={statusClass(fixture.status)}>{displayStatus}</span>
          <span className={styles.badge}>{formatKickoff(fixture.startsAt, locale)}</span>
          {fixture.resultSnapshot?.capturedAt ? (
            <span className={styles.badge}>
              Updated {formatSnapshotTime(fixture.resultSnapshot.capturedAt, locale)}
            </span>
          ) : null}
        </div>

        <p className={styles.eyebrow}>Match</p>
        <h1 className={styles.title}>{fixture.homeTeam.name} vs {fixture.awayTeam.name}</h1>

        <div className={styles.scoreline}>
          <div className={styles.teamCard}>
            <span>Home</span>
            <strong>{fixture.homeTeam.name}</strong>
          </div>

          <div className={styles.centerScore}>
            <strong className={styles.scoreValue}>
              {scoreAvailable
                ? `${fixture.resultSnapshot.homeScore} - ${fixture.resultSnapshot.awayScore}`
                : formatFixtureStatus(fixture.status, locale)}
            </strong>
            <div className={styles.scoreMeta}>
              {venue?.name ? <span className={styles.badge}>{venue.name}</span> : null}
              {referee?.name ? <span className={styles.badge}>{referee.name}</span> : null}
            </div>
          </div>

          <div className={styles.teamCard}>
            <span>Away</span>
            <strong>{fixture.awayTeam.name}</strong>
          </div>
        </div>
      </header>

      {fixture.detail.keyEvents.length ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Highlights</p>
              <h2 className={styles.sectionTitle}>Key events</h2>
            </div>
          </div>

          <div className={styles.keyEvents}>
            {fixture.detail.keyEvents.map((event) => (
              <article key={event.id} className={styles.keyEventCard}>
                <p className={styles.minute}>{event.minuteLabel || "Event"}</p>
                <h3 className={styles.timelineTitle}>{event.title}</h3>
                {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                <p className={styles.muted}>{event.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Timeline</p>
            <h2 className={styles.sectionTitle}>Match events</h2>
          </div>
          <span className={styles.badge}>{fixture.detail.timeline.length}</span>
        </div>

        {fixture.detail.timeline.length ? (
          <div className={styles.timeline}>
            {fixture.detail.timeline.map((event) => (
              <article key={event.id} className={styles.timelineItem}>
                <strong className={styles.minute}>{event.minuteLabel || "Event"}</strong>
                <div>
                  <h3 className={styles.timelineTitle}>{event.title}</h3>
                  {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                  {event.secondaryActor ? <p className={styles.muted}>{event.secondaryActor}</p> : null}
                  <p className={styles.muted}>{event.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No event timeline is available for this football match yet.</div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Stats</p>
            <h2 className={styles.sectionTitle}>Match statistics</h2>
          </div>
          <span className={styles.badge}>{fixture.detail.statistics.length}</span>
        </div>

        {fixture.detail.statistics.length ? (
          <div className={styles.stats}>
            {fixture.detail.statistics.map((entry) => (
              <div key={entry.key} className={styles.statRow}>
                <strong className={styles.statValue}>{entry.home || "-"}</strong>
                <span className={styles.statLabel}>{entry.label}</span>
                <div className={styles.statTrack}>
                  <span className={styles.statHome} style={{ width: `${entry.homeShare}%` }} />
                  <span className={styles.statAway} style={{ width: `${entry.awayShare}%` }} />
                </div>
                <strong className={styles.statValue}>{entry.away || "-"}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Statistics are not available for this football match yet.</div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Lineups</p>
            <h2 className={styles.sectionTitle}>Starting elevens</h2>
          </div>
        </div>

        {fixture.detail.lineups.home.starters.length || fixture.detail.lineups.away.starters.length ? (
          <div className={styles.lineupGrid}>
            {[
              {
                key: "home",
                teamName: fixture.homeTeam.name,
                lineup: fixture.detail.lineups.home,
              },
              {
                key: "away",
                teamName: fixture.awayTeam.name,
                lineup: fixture.detail.lineups.away,
              },
            ].map((entry) => (
              <article key={entry.key} className={styles.lineupCard}>
                <p className={styles.eyebrow}>{entry.teamName}</p>
                <h3 className={styles.timelineTitle}>
                  {entry.lineup.formation ? `Formation ${entry.lineup.formation}` : "Lineup"}
                </h3>
                <div>
                  {entry.lineup.starters.map((player) => (
                    <div key={player.id} className={styles.lineupRow}>
                      <span>{player.name}</span>
                      <span className={styles.muted}>#{player.jerseyNumber}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>Lineups have not been published for this football match yet.</div>
        )}
      </section>
    </section>
  );
}
