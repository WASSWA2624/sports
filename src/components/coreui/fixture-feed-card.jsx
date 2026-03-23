import Link from "next/link";
import { FavoriteToggle } from "./favorite-toggle";
import styles from "./styles.module.css";
import {
  formatFixtureStatus,
  formatKickoff,
  formatSnapshotTime,
} from "../../lib/coreui/format";
import {
  buildFixtureIncidentIndicators,
  buildFixtureRefreshProfile,
  getFixtureMinute,
  isTerminalStatus,
} from "../../lib/coreui/live-detail";

export function FixtureFeedCard({ fixture, locale, mode = "live", showLeague = true }) {
  const href = `/${locale}/match/${fixture.externalRef || fixture.id}`;
  const minuteLabel = fixture.status === "LIVE" ? getFixtureMinute(fixture) : null;
  const refreshProfile = buildFixtureRefreshProfile(fixture);
  const isFrozen = isTerminalStatus(fixture.status) && fixture.resultSnapshot?.capturedAt;
  const indicators = buildFixtureIncidentIndicators(fixture);
  const statusLabel = minuteLabel || formatFixtureStatus(fixture.status, locale);

  return (
    <article className={styles.fixtureFeedRow}>
      <div className={styles.fixtureFeedKickoff}>
        <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>{statusLabel}</span>
        <span className={styles.fixtureFeedTime}>{formatKickoff(fixture.startsAt, locale)}</span>
        {fixture.round ? <span className={styles.fixtureFeedMeta}>{fixture.round}</span> : null}
      </div>

      <div className={styles.fixtureFeedMain}>
        {showLeague ? <p className={styles.eyebrow}>{fixture.league?.name || "League"}</p> : null}

        <div className={styles.fixtureFeedTeams}>
          <div className={styles.fixtureFeedTeamRow}>
            <span>{fixture.homeTeam?.shortName || fixture.homeTeam?.name}</span>
            <strong>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
          </div>
          <div className={styles.fixtureFeedTeamRow}>
            <span>{fixture.awayTeam?.shortName || fixture.awayTeam?.name}</span>
            <strong>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
          </div>
        </div>

        {fixture.resultSnapshot?.statusText ? (
          <p className={styles.fixtureSummary}>{fixture.resultSnapshot.statusText}</p>
        ) : null}

        <div className={styles.fixtureFeedExtras}>
          {fixture.venue ? <span className={styles.fixtureFeedMeta}>{fixture.venue}</span> : null}
          {indicators.length
            ? indicators.map((indicator) => (
                <span key={indicator} className={styles.indicatorBadge}>
                  {indicator}
                </span>
              ))
            : null}
          {mode === "live" && refreshProfile.enabled ? (
            <span className={styles.fixtureFeedMeta}>{refreshProfile.label}</span>
          ) : null}
          {mode === "results" && isFrozen ? (
            <span className={styles.fixtureFeedMeta}>
              Snapshot frozen {formatSnapshotTime(fixture.resultSnapshot.capturedAt, locale)}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.fixtureFeedActions}>
        <FavoriteToggle itemId={`fixture:${fixture.id}`} locale={locale} compact />
        <Link href={href} className={styles.actionLink}>
          Match
        </Link>
      </div>
    </article>
  );
}
