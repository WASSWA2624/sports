import Link from "next/link";
import { FavoriteToggle } from "./favorite-toggle";
import styles from "./styles.module.css";
import { formatFixtureStatus, formatKickoff } from "../../lib/coreui/format";

export function FixtureCard({ fixture, locale }) {
  const href = `/${locale}/match/${fixture.externalRef || fixture.id}`;

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
        <FavoriteToggle itemId={`fixture:${fixture.id}`} locale={locale} />
      </div>
      <div className={styles.fixtureMeta}>
        <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>
          {formatFixtureStatus(fixture.status, locale)}
        </span>
        <span>{formatKickoff(fixture.startsAt, locale)}</span>
        {(fixture.venue || fixture.round) ? <span>{fixture.venue || fixture.round}</span> : null}
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
      {fixture.resultSnapshot?.statusText ? (
        <p className={styles.fixtureSummary}>{fixture.resultSnapshot.statusText}</p>
      ) : null}
    </article>
  );
}
