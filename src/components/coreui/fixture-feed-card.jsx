import Link from "next/link";
import { FavoriteToggle } from "./favorite-toggle";
import styles from "./styles.module.css";
import {
  formatFixtureStatus,
  formatKickoff,
  formatSnapshotTime,
} from "../../lib/coreui/format";
import {
  buildFixtureRefreshProfile,
  getFixtureMinute,
  isTerminalStatus,
} from "../../lib/coreui/live-detail";

export function FixtureFeedCard({ fixture, locale, mode = "live" }) {
  const href = `/${locale}/match/${fixture.externalRef || fixture.id}`;
  const minuteLabel = fixture.status === "LIVE" ? getFixtureMinute(fixture) : null;
  const refreshProfile = buildFixtureRefreshProfile(fixture);
  const isFrozen = isTerminalStatus(fixture.status) && fixture.resultSnapshot?.capturedAt;

  return (
    <article className={styles.fixtureCard}>
      <div className={styles.fixtureCardTop}>
        <div>
          <p className={styles.eyebrow}>{fixture.league?.name || "League"}</p>
          <h3 className={styles.fixtureTitle}>
            <Link href={href}>
              {fixture.homeTeam?.name} vs {fixture.awayTeam?.name}
            </Link>
          </h3>
        </div>
        <div className={styles.inlineBadgeRow}>
          {minuteLabel ? <span className={styles.liveBadge}>{minuteLabel}</span> : null}
          <FavoriteToggle itemId={`fixture:${fixture.id}`} locale={locale} />
        </div>
      </div>

      <div className={styles.fixtureMeta}>
        <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>
          {formatFixtureStatus(fixture.status, locale)}
        </span>
        <span>{formatKickoff(fixture.startsAt, locale)}</span>
        {fixture.round ? <span>{fixture.round}</span> : null}
        {fixture.venue ? <span>{fixture.venue}</span> : null}
      </div>

      <div className={styles.scoreLine}>
        <div>
          <span>{fixture.homeTeam?.shortName || fixture.homeTeam?.name}</span>
          <strong>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
        </div>
        <div>
          <span>{fixture.awayTeam?.shortName || fixture.awayTeam?.name}</span>
          <strong>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
        </div>
      </div>

      <div className={styles.fixtureFootnotes}>
        {fixture.resultSnapshot?.statusText ? (
          <p className={styles.fixtureSummary}>{fixture.resultSnapshot.statusText}</p>
        ) : null}

        {mode === "live" && refreshProfile.enabled ? (
          <p className={styles.snapshotNote}>{refreshProfile.label}</p>
        ) : null}

        {mode === "results" && isFrozen ? (
          <p className={styles.snapshotNote}>
            Snapshot frozen {formatSnapshotTime(fixture.resultSnapshot.capturedAt, locale)}
          </p>
        ) : null}
      </div>

      <div className={styles.fixtureActionRow}>
        <Link href={href} className={styles.actionLink}>
          Match centre
        </Link>
        {fixture.league?.code ? (
          <Link href={`/${locale}/leagues/${fixture.league.code}`} className={styles.badge}>
            {fixture.league.name}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
