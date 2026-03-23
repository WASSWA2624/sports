import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { formatDictionaryText, getDictionary } from "../../../../lib/coreui/dictionaries";
import {
  formatFixtureStatus,
  formatKickoff,
  formatSnapshotTime,
} from "../../../../lib/coreui/format";
import { getLiveMatchDetail } from "../../../../lib/coreui/live-read";
import { FavoriteToggle } from "../../../../components/coreui/favorite-toggle";
import { LiveRefresh } from "../../../../components/coreui/live-refresh";
import styles from "../../../../components/coreui/styles.module.css";

function coverageTone(state) {
  return state === "available" ? styles.coverageAvailable : styles.coverageMissing;
}

function getSideLabel(side, dictionary) {
  if (side === "home") {
    return dictionary.homeSide;
  }

  if (side === "away") {
    return dictionary.awaySide;
  }

  return dictionary.matchSide;
}

export async function generateMetadata({ params }) {
  const { locale, fixtureRef } = await params;
  const fixture = await getLiveMatchDetail(fixtureRef, locale);
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    fixture ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}` : dictionary.metaMatchFallbackTitle,
    fixture
      ? formatDictionaryText(dictionary.metaMatchDescription, {
          home: fixture.homeTeam.name,
          away: fixture.awayTeam.name,
        })
      : dictionary.metaMatchFallbackDescription,
    `/match/${fixtureRef}`
  );
}

export default async function MatchDetailPage({ params }) {
  const { locale, fixtureRef } = await params;
  const dictionary = getDictionary(locale);
  const fixture = await getLiveMatchDetail(fixtureRef, locale);

  if (!fixture) {
    notFound();
  }

  const detail = fixture.detail;
  const coverage = [
    { label: dictionary.timeline, state: detail.coverage.timeline },
    { label: dictionary.statistics, state: detail.coverage.statistics },
    { label: dictionary.lineups, state: detail.coverage.lineups },
    { label: dictionary.keyEvents, state: detail.coverage.keyEvents },
  ];
  const hasLineups =
    detail.lineups.home.starters.length ||
    detail.lineups.home.bench.length ||
    detail.lineups.away.starters.length ||
    detail.lineups.away.bench.length;

  return (
    <section className={styles.section}>
      <LiveRefresh
        enabled={detail.refresh.enabled}
        intervalMs={detail.refresh.intervalMs}
        until={detail.refresh.until}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{fixture.league.name}</p>
          <h1 className={styles.pageTitle}>
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </h1>
          <p className={styles.pageLead}>{dictionary.matchLead}</p>
        </div>
        <FavoriteToggle itemId={`fixture:${fixture.id}`} locale={locale} />
      </header>

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.overview}</h2>
            <span className={fixture.status === "LIVE" ? styles.liveBadge : styles.badge}>
              {formatFixtureStatus(fixture.status, locale)}
            </span>
          </div>

          <div className={styles.scoreboard}>
            <div className={styles.scoreboardTeam}>
              <span>{fixture.homeTeam.name}</span>
              <strong>{fixture.resultSnapshot?.homeScore ?? "-"}</strong>
            </div>
            <div className={styles.scoreboardDivider}>-</div>
            <div className={styles.scoreboardTeam}>
              <span>{fixture.awayTeam.name}</span>
              <strong>{fixture.resultSnapshot?.awayScore ?? "-"}</strong>
            </div>
          </div>

          <div className={styles.metaChips}>
            {detail.liveState.minuteLabel ? (
              <span className={styles.liveBadge}>{detail.liveState.minuteLabel}</span>
            ) : null}
            {detail.liveState.statusText ? <span className={styles.badge}>{detail.liveState.statusText}</span> : null}
            {detail.resultFreeze.isFrozen ? (
              <span className={styles.badge}>
                {formatDictionaryText(dictionary.snapshotFrozenLabel, {
                  time: formatSnapshotTime(detail.resultFreeze.frozenAt, locale),
                })}
              </span>
            ) : null}
            {!detail.resultFreeze.isFrozen && detail.refresh.label ? (
              <span className={styles.badge}>{detail.refresh.label}</span>
            ) : null}
          </div>

          <div className={styles.detailMeta}>
            <span>{formatKickoff(fixture.startsAt, locale)}</span>
            {fixture.venue ? <span>{fixture.venue}</span> : null}
            {fixture.round ? <span>{fixture.round}</span> : null}
            {detail.liveState.reason ? <span>{detail.liveState.reason}</span> : null}
          </div>
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.competitionSection}</h2>
          </div>

          <div className={styles.linkList}>
            <Link href={`/${locale}/leagues/${fixture.league.code}`} className={styles.actionLink}>
              {fixture.league.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.homeTeam.id}`} className={styles.badge}>
              {fixture.homeTeam.name}
            </Link>
            <Link href={`/${locale}/teams/${fixture.awayTeam.id}`} className={styles.badge}>
              {fixture.awayTeam.name}
            </Link>
          </div>

          <div className={styles.coverageGrid}>
            {coverage.map((entry) => (
              <div key={entry.label} className={styles.coverageItem}>
                <span>{entry.label}</span>
                <strong className={coverageTone(entry.state)}>
                  {entry.state === "available" ? dictionary.coverageReady : dictionary.coverageWaiting}
                </strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.highlights}</p>
            <h2 className={styles.sectionTitle}>{dictionary.keyEvents}</h2>
          </div>
          <span className={styles.badge}>{detail.keyEvents.length}</span>
        </div>

        {detail.keyEvents.length ? (
          <div className={styles.eventGrid}>
            {detail.keyEvents.map((event) => (
              <article key={event.id} className={styles.panel}>
                <div className={styles.cardHeader}>
                  <span
                    className={
                      event.side === "home"
                        ? styles.homeMarker
                        : event.side === "away"
                          ? styles.awayMarker
                          : styles.badge
                    }
                  >
                    {getSideLabel(event.side, dictionary)}
                  </span>
                  {event.minuteLabel ? <span className={styles.badge}>{event.minuteLabel}</span> : null}
                </div>
                <h3 className={styles.cardTitle}>{event.title}</h3>
                {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                {event.secondaryActor ? (
                  <p className={styles.muted}>
                    {formatDictionaryText(dictionary.eventWith, { name: event.secondaryActor })}
                  </p>
                ) : null}
                <p className={styles.fixtureSummary}>{event.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.eventCoveragePending}</div>
        )}
      </section>

      <div className={styles.analysisGrid}>
        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.timeline}</h2>
            <span className={styles.badge}>{detail.timeline.length}</span>
          </div>

          {detail.timeline.length ? (
            <div className={styles.timeline}>
              {detail.timeline.map((event) => (
                <div key={event.id} className={styles.timelineItem}>
                  <div className={styles.timelineMinute}>{event.minuteLabel || dictionary.play}</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.cardHeader}>
                      <strong>{event.title}</strong>
                      <span
                        className={
                          event.side === "home"
                            ? styles.homeMarker
                            : event.side === "away"
                              ? styles.awayMarker
                              : styles.badge
                        }
                      >
                        {getSideLabel(event.side, dictionary)}
                      </span>
                    </div>
                    {event.actor ? <p className={styles.muted}>{event.actor}</p> : null}
                    {event.secondaryActor ? (
                      <p className={styles.muted}>
                        {formatDictionaryText(dictionary.eventRelated, { name: event.secondaryActor })}
                      </p>
                    ) : null}
                    <p className={styles.fixtureSummary}>{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.timelinePending}</div>
          )}
        </article>

        <article className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{dictionary.statistics}</h2>
            <span className={styles.badge}>{detail.statistics.length}</span>
          </div>

          {detail.statistics.length ? (
            <div className={styles.statRows}>
              {detail.statistics.map((entry) => (
                <div key={entry.key} className={styles.statRow}>
                  <span className={styles.statValue}>{entry.home || "-"}</span>
                  <div className={styles.statMeter}>
                    <strong>{entry.label}</strong>
                    <div className={styles.statBars}>
                      <span
                        className={styles.statBarHome}
                        style={{ width: `${entry.homeShare}%` }}
                      />
                      <span
                        className={styles.statBarAway}
                        style={{ width: `${entry.awayShare}%` }}
                      />
                    </div>
                  </div>
                  <span className={styles.statValue}>{entry.away || "-"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>{dictionary.statisticsPending}</div>
          )}
        </article>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.squads}</p>
            <h2 className={styles.sectionTitle}>{dictionary.lineups}</h2>
          </div>
          <span className={styles.badge}>
            {detail.lineups.home.starters.length + detail.lineups.away.starters.length}
          </span>
        </div>

        {hasLineups ? (
          <div className={styles.analysisGrid}>
            {[
              {
                key: "home",
                team: fixture.homeTeam.name,
                lineup: detail.lineups.home,
                markerClass: styles.homeMarker,
              },
              {
                key: "away",
                team: fixture.awayTeam.name,
                lineup: detail.lineups.away,
                markerClass: styles.awayMarker,
              },
            ].map((entry) => (
              <article key={entry.key} className={styles.detailCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{entry.team}</h3>
                    <p className={styles.muted}>
                      {entry.lineup.formation
                        ? formatDictionaryText(dictionary.formation, {
                            value: entry.lineup.formation,
                          })
                        : dictionary.formationPending}
                    </p>
                  </div>
                  <span className={entry.markerClass}>{getSideLabel(entry.key, dictionary)}</span>
                </div>

                <div className={styles.lineupSection}>
                  <strong>{dictionary.startingXi}</strong>
                  <div className={styles.lineupList}>
                    {entry.lineup.starters.map((player) => (
                      <div key={player.id} className={styles.lineupRow}>
                        <span className={styles.jerseyBadge}>{player.jerseyNumber}</span>
                        <div>
                          <strong>{player.name}</strong>
                          {player.formationField ? (
                            <p className={styles.muted}>
                              {formatDictionaryText(dictionary.slot, {
                                value: player.formationField,
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {entry.lineup.bench.length ? (
                  <div className={styles.lineupSection}>
                    <strong>{dictionary.bench}</strong>
                    <div className={styles.lineupList}>
                      {entry.lineup.bench.map((player) => (
                        <div key={player.id} className={styles.lineupRow}>
                          <span className={styles.jerseyBadge}>{player.jerseyNumber}</span>
                          <strong>{player.name}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.lineupsPending}</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{dictionary.matchDetail}</p>
            <h2 className={styles.sectionTitle}>{dictionary.markets}</h2>
          </div>
        </div>

        {fixture.oddsMarkets.length ? (
          <div className={styles.grid}>
            {fixture.oddsMarkets.map((market) => (
              <article key={market.id} className={styles.detailCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{market.marketType}</h3>
                    <p className={styles.muted}>{market.bookmaker}</p>
                  </div>
                  <span className={styles.badge}>
                    {market.suspended ? dictionary.marketSuspended : dictionary.marketOpen}
                  </span>
                </div>
                <div className={styles.grid}>
                  {market.selections.map((selection) => (
                    <div key={selection.id} className={styles.panel}>
                      <strong>{selection.label}</strong>
                      <p className={styles.muted}>{selection.priceDecimal.toString()}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{dictionary.oddsPending}</div>
        )}
      </section>
    </section>
  );
}
