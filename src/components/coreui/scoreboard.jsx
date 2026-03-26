import Link from "next/link";
import { buildMatchStatusLabel, buildMatchTimeLabel } from "../../lib/coreui/match-data";
import { buildCompetitionHref, buildMatchHref } from "../../lib/coreui/routes";
import { LiveRefresh } from "./live-refresh";
import styles from "./scoreboard.module.css";

function buildBoardHref(locale, nextParams = {}, current = {}) {
  const params = new URLSearchParams();
  const merged = { ...current, ...nextParams };

  for (const [key, value] of Object.entries(merged)) {
    if (!value || value === "all" || value === "ALL") {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ""}`;
}

function shiftDate(dateString, amount) {
  const next = new Date(`${dateString}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

function statusLabel(value) {
  const normalized = String(value || "").toUpperCase();

  if (normalized === "ALL") {
    return "All";
  }

  if (normalized === "SCHEDULED") {
    return "Upcoming";
  }

  if (normalized === "FINISHED") {
    return "Results";
  }

  return "Live";
}

function isScoreVisible(fixture) {
  return fixture.status !== "SCHEDULED" && Number.isFinite(fixture.resultSnapshot?.homeScore);
}

export function MatchRow({ fixture, locale }) {
  return (
    <article className={styles.matchRow}>
      <Link href={buildMatchHref(locale, fixture)} className={styles.matchRowMain}>
        <div className={styles.matchRowState}>
          <span className={fixture.status === "LIVE" ? styles.statusLive : styles.statusChip}>
            {buildMatchStatusLabel(fixture, locale)}
          </span>
          <span className={styles.matchRowMeta}>{buildMatchTimeLabel(fixture, locale)}</span>
        </div>

        <div className={styles.matchTeams}>
          <div className={styles.teamLine}>
            <span className={styles.teamName}>{fixture.homeTeam.shortName || fixture.homeTeam.name}</span>
            <strong className={styles.teamScore}>
              {isScoreVisible(fixture) ? fixture.resultSnapshot.homeScore : ""}
            </strong>
          </div>
          <div className={styles.teamLine}>
            <span className={styles.teamName}>{fixture.awayTeam.shortName || fixture.awayTeam.name}</span>
            <strong className={styles.teamScore}>
              {isScoreVisible(fixture) ? fixture.resultSnapshot.awayScore : ""}
            </strong>
          </div>
        </div>
      </Link>

      <Link href={buildCompetitionHref(locale, fixture.league)} className={styles.rowSideAction}>
        {fixture.league.name}
      </Link>
    </article>
  );
}

export function Scoreboard({ locale, title, lead, feed }) {
  const selectedDateLong = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(feed.selectedDate));
  const currentFilters = {
    date: feed.selectedDate,
    q: feed.query,
    league: feed.selectedLeague,
    time: feed.selectedTime,
  };

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={feed.refresh?.enabled}
        intervalMs={feed.refresh?.intervalMs}
        until={feed.refresh?.until}
      />

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Football</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>

        <div className={styles.heroMeta}>
          <span className={styles.heroBadge}>{selectedDateLong}</span>
          <span className={styles.heroBadge}>{feed.summary.total} matches</span>
        </div>
      </header>

      <section className={styles.commandDeck}>
        <div className={styles.dateRail}>
          <Link
            href={buildBoardHref(locale, {
              date: shiftDate(feed.selectedDate, -1),
              status: feed.selectedStatus,
            }, currentFilters)}
            className={styles.commandButton}
          >
            Previous day
          </Link>
          <span className={styles.datePill}>{selectedDateLong}</span>
          <Link
            href={buildBoardHref(locale, {
              date: shiftDate(feed.selectedDate, 1),
              status: feed.selectedStatus,
            }, currentFilters)}
            className={styles.commandButton}
          >
            Next day
          </Link>
        </div>

        <div className={styles.filterRail}>
          {feed.statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildBoardHref(locale, {
                status: option.value.toLowerCase(),
              }, currentFilters)}
              className={option.value === feed.selectedStatus ? styles.filterChipActive : styles.filterChip}
            >
              <span>{statusLabel(option.value)}</span>
              <strong>{option.count}</strong>
            </Link>
          ))}
        </div>

        <form action={`/${locale}`} className={styles.searchForm}>
          <input type="hidden" name="date" value={feed.selectedDate} />
          {feed.selectedStatus !== "ALL" ? (
            <input type="hidden" name="status" value={feed.selectedStatus.toLowerCase()} />
          ) : null}
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Search</span>
            <input
              type="search"
              name="q"
              defaultValue={feed.query}
              placeholder="League, team, or kickoff time"
              className={styles.searchInput}
            />
          </label>

          <label className={styles.searchField}>
            <span className={styles.searchLabel}>League</span>
            <select name="league" defaultValue={feed.selectedLeague} className={styles.searchInput}>
              {feed.leagueOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Time</span>
            <select name="time" defaultValue={feed.selectedTime} className={styles.searchInput}>
              {feed.timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className={styles.searchSubmit}>
            Search matches
          </button>
        </form>
      </section>

      <section className={styles.summaryGrid}>
        {[
          { key: "ALL", count: feed.summary.total },
          { key: "LIVE", count: feed.summary.LIVE },
          { key: "SCHEDULED", count: feed.summary.SCHEDULED },
          { key: "FINISHED", count: feed.summary.FINISHED },
        ].map((entry) => (
          <article key={entry.key} className={styles.summaryCard}>
            <span>{statusLabel(entry.key)}</span>
            <strong>{entry.count}</strong>
          </article>
        ))}
      </section>

      <div className={styles.groupStack}>
        {feed.groups.length ? (
          feed.groups.map((group) => (
            <section key={group.key} className={styles.groupCard}>
              <div className={styles.groupHeader}>
                <div>
                  <p className={styles.groupCountry}>{group.country}</p>
                  <h2 className={styles.groupTitle}>
                    <Link href={`/${locale}/leagues/${group.leagueCode}`}>{group.leagueName}</Link>
                  </h2>
                </div>

                <div className={styles.groupSummary}>
                  <span>{group.summary.LIVE || 0} live</span>
                  <span>{group.summary.SCHEDULED || 0} upcoming</span>
                  <span>{group.summary.FINISHED || 0} results</span>
                </div>
              </div>

              <div className={styles.matchList}>
                {group.fixtures.map((fixture) => (
                  <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className={styles.emptyState}>
            No matches match this search. Try another league, time window, or date.
          </div>
        )}
      </div>
    </section>
  );
}
