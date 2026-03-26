import Link from "next/link";
import { buildLiveBoardFixtureSignals } from "../../lib/coreui/live-board";
import { formatKickoff, formatMatchday } from "../../lib/coreui/format";
import { buildCompetitionHref, buildMatchHref } from "../../lib/coreui/routes";
import { LiveRefresh } from "./live-refresh";
import styles from "./scoreboard.module.css";

function isScoreAvailable(snapshot) {
  return Number.isFinite(snapshot?.homeScore) && Number.isFinite(snapshot?.awayScore);
}

function buildBoardHref(locale, { date, status } = {}) {
  const params = new URLSearchParams();

  if (date) {
    params.set("date", date);
  }

  if (status && status !== "ALL") {
    params.set("status", String(status).toLowerCase());
  }

  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}

function shiftDate(dateString, amount) {
  const next = new Date(`${dateString}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

function statusLabel(value, dictionary) {
  const normalized = String(value || "").toUpperCase();

  if (normalized === "ALL") {
    return dictionary?.browseAll || "All";
  }

  if (normalized === "SCHEDULED") {
    return dictionary?.statusScheduled || "Scheduled";
  }

  if (normalized === "FINISHED") {
    return dictionary?.statusFinished || "Finished";
  }

  if (normalized === "LIVE") {
    return dictionary?.live || "Live";
  }

  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function summaryLabel(value, dictionary) {
  const normalized = String(value || "").toUpperCase();

  if (normalized === "LIVE") {
    return dictionary?.live || "Live";
  }

  if (normalized === "FINISHED") {
    return dictionary?.results || "Results";
  }

  if (normalized === "SCHEDULED") {
    return dictionary?.statusScheduled || "Scheduled";
  }

  return "Matches";
}

function rowStatusClass(status) {
  if (status === "LIVE") {
    return styles.statusLive;
  }

  if (status === "FINISHED") {
    return styles.statusFinished;
  }

  return styles.statusChip;
}

export function MatchRow({ fixture, locale }) {
  const signals = buildLiveBoardFixtureSignals(fixture, locale);
  const matchHref = buildMatchHref(locale, fixture);
  const competitionHref = fixture.league?.code ? buildCompetitionHref(locale, fixture.league) : null;
  const scoreAvailable = isScoreAvailable(fixture.resultSnapshot);
  const showScore = scoreAvailable && fixture.status !== "SCHEDULED";
  const metaLabel =
    fixture.status === "SCHEDULED"
      ? new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(fixture.startsAt))
      : signals.keyMomentLabel || formatKickoff(fixture.startsAt, locale);

  return (
    <article className={styles.matchRow}>
      <Link href={matchHref} className={styles.matchRowMain}>
        <div className={styles.matchRowState}>
          <span className={rowStatusClass(fixture.status)}>{signals.statusLabel}</span>
          <span className={styles.matchRowMeta}>{metaLabel}</span>
        </div>

        <div className={styles.matchTeams}>
          <div className={styles.teamLine}>
            <span className={styles.teamName}>{fixture.homeTeam?.shortName || fixture.homeTeam?.name}</span>
            <strong className={styles.teamScore}>
              {showScore ? fixture.resultSnapshot.homeScore : fixture.status === "SCHEDULED" ? "" : "-"}
            </strong>
          </div>
          <div className={styles.teamLine}>
            <span className={styles.teamName}>{fixture.awayTeam?.shortName || fixture.awayTeam?.name}</span>
            <strong className={styles.teamScore}>
              {showScore ? fixture.resultSnapshot.awayScore : fixture.status === "SCHEDULED" ? "" : "-"}
            </strong>
          </div>
        </div>
      </Link>

      {competitionHref ? (
        <Link href={competitionHref} className={styles.rowSideAction}>
          League
        </Link>
      ) : null}
    </article>
  );
}

export function Scoreboard({
  locale,
  dictionary,
  title,
  lead,
  selectedStatus = "ALL",
  feed,
  emptyLabel = "No matches are available for this filter yet.",
}) {
  const selectedDateLabel = formatMatchday(feed.selectedDate, locale);
  const selectedDateLong = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(feed.selectedDate));

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={feed.refresh?.enabled}
        intervalMs={feed.refresh?.intervalMs}
        until={feed.refresh?.until}
      />

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Matchday</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>

        <div className={styles.heroMeta}>
          <span className={styles.heroBadge}>{selectedDateLong}</span>
          <span className={styles.heroBadge}>
            {feed.summary.total} {summaryLabel("ALL", dictionary).toLowerCase()}
          </span>
        </div>
      </header>

      <section className={styles.commandDeck}>
        <div className={styles.dateRail}>
          <Link
            href={buildBoardHref(locale, {
              date: shiftDate(feed.selectedDate, -1),
              status: selectedStatus,
            })}
            className={styles.commandButton}
          >
            {dictionary?.previousDay || "Yesterday"}
          </Link>
          <span className={styles.datePill}>{selectedDateLabel}</span>
          <Link
            href={buildBoardHref(locale, {
              date: shiftDate(feed.selectedDate, 1),
              status: selectedStatus,
            })}
            className={styles.commandButton}
          >
            {dictionary?.nextDay || "Tomorrow"}
          </Link>
        </div>

        <div className={styles.filterRail}>
          {feed.statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildBoardHref(locale, {
                date: feed.selectedDate,
                status: option.value,
              })}
              className={option.value === selectedStatus ? styles.filterChipActive : styles.filterChip}
            >
              <span>{statusLabel(option.value, dictionary)}</span>
              <strong>{option.count}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.summaryGrid}>
        {[
          { key: "ALL", count: feed.summary.total },
          { key: "LIVE", count: feed.summary.LIVE },
          { key: "FINISHED", count: feed.summary.FINISHED },
          { key: "SCHEDULED", count: feed.summary.SCHEDULED },
        ].map((entry) => (
          <article key={entry.key} className={styles.summaryCard}>
            <span>{summaryLabel(entry.key, dictionary)}</span>
            <strong>{entry.count}</strong>
          </article>
        ))}
      </section>

      {feed.surfaceState?.degraded ? (
        <div className={styles.notice}>Provider data is degraded. Showing the latest stored football snapshot.</div>
      ) : null}

      {feed.surfaceState?.stale ? (
        <div className={styles.notice}>
          {feed.surfaceState.staleCount} live matches are waiting on a fresher sync.
        </div>
      ) : null}

      <div className={styles.groupStack}>
        {feed.groups.length ? (
          feed.groups.map((group) => {
            const competitionHref = group.leagueCode
              ? buildCompetitionHref(locale, { code: group.leagueCode })
              : null;

            return (
              <section key={group.key} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div>
                    <p className={styles.groupCountry}>{group.country || "International"}</p>
                    <h2 className={styles.groupTitle}>
                      {competitionHref ? <Link href={competitionHref}>{group.leagueName}</Link> : group.leagueName}
                    </h2>
                  </div>

                  <div className={styles.groupSummary}>
                    <span>{group.summary?.LIVE || 0} {(dictionary?.live || "Live").toLowerCase()}</span>
                    <span>{group.summary?.SCHEDULED || 0} {(dictionary?.statusScheduled || "Scheduled").toLowerCase()}</span>
                    <span>{group.summary?.FINISHED || 0} {(dictionary?.statusFinished || "Finished").toLowerCase()}</span>
                  </div>
                </div>

                <div className={styles.matchList}>
                  {group.fixtures.map((fixture) => (
                    <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className={styles.emptyState}>{emptyLabel}</div>
        )}
      </div>
    </section>
  );
}
