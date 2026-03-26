import Link from "next/link";
import { buildMatchStatusLabel, buildMatchTimeLabel } from "../../lib/coreui/match-data";
import { buildMatchHref } from "../../lib/coreui/routes";
import { LiveRefresh } from "./live-refresh";
import styles from "./scoreboard.module.css";

const TEAM_PALETTE_FALLBACKS = [
  {
    accent: "#9dd7ff",
    soft: "rgba(69, 151, 255, 0.18)",
    contrast: "#0d2d58",
  },
  {
    accent: "#ffb86f",
    soft: "rgba(255, 159, 67, 0.18)",
    contrast: "#4d2400",
  },
  {
    accent: "#ff8ca1",
    soft: "rgba(255, 93, 130, 0.18)",
    contrast: "#571325",
  },
  {
    accent: "#9de7b8",
    soft: "rgba(71, 203, 119, 0.18)",
    contrast: "#113d24",
  },
  {
    accent: "#d2b0ff",
    soft: "rgba(153, 102, 255, 0.18)",
    contrast: "#32204f",
  },
];

const TEAM_PALETTE_OVERRIDES = {
  arsenal: {
    accent: "#ff7272",
    soft: "rgba(206, 33, 44, 0.18)",
    contrast: "#4f141a",
  },
  chelsea: {
    accent: "#8fc2ff",
    soft: "rgba(3, 70, 148, 0.2)",
    contrast: "#0e2b58",
  },
  "real madrid": {
    accent: "#d7c39b",
    soft: "rgba(196, 171, 116, 0.2)",
    contrast: "#4c3f1f",
  },
  "bayern munich": {
    accent: "#ff9aa7",
    soft: "rgba(220, 53, 69, 0.2)",
    contrast: "#541923",
  },
  barcelona: {
    accent: "#ffb26b",
    soft: "rgba(166, 50, 82, 0.22)",
    contrast: "#51223e",
  },
  sevilla: {
    accent: "#ff928f",
    soft: "rgba(204, 63, 52, 0.18)",
    contrast: "#4f1e18",
  },
  inter: {
    accent: "#8ad2ff",
    soft: "rgba(0, 115, 207, 0.22)",
    contrast: "#0a3258",
  },
  lazio: {
    accent: "#b6ddff",
    soft: "rgba(88, 160, 220, 0.2)",
    contrast: "#173752",
  },
  "borussia dortmund": {
    accent: "#ffe278",
    soft: "rgba(255, 203, 5, 0.22)",
    contrast: "#4d3d00",
  },
  "rb leipzig": {
    accent: "#ff9aa7",
    soft: "rgba(219, 58, 52, 0.2)",
    contrast: "#53171b",
  },
  "manchester city": {
    accent: "#9ddcff",
    soft: "rgba(108, 171, 221, 0.22)",
    contrast: "#133857",
  },
  liverpool: {
    accent: "#ff8d9c",
    soft: "rgba(200, 16, 46, 0.2)",
    contrast: "#52131f",
  },
  "atletico madrid": {
    accent: "#ff9f96",
    soft: "rgba(190, 30, 45, 0.18)",
    contrast: "#511721",
  },
  "real sociedad": {
    accent: "#8fc2ff",
    soft: "rgba(44, 125, 229, 0.2)",
    contrast: "#15325a",
  },
  "paris saint-germain": {
    accent: "#a4c4ff",
    soft: "rgba(0, 45, 114, 0.22)",
    contrast: "#0d2348",
  },
  napoli: {
    accent: "#8de1ff",
    soft: "rgba(0, 122, 255, 0.2)",
    contrast: "#0f345c",
  },
  "ac milan": {
    accent: "#ff877d",
    soft: "rgba(214, 41, 56, 0.22)",
    contrast: "#57181f",
  },
};

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
    return "Fixtures";
  }

  if (normalized === "FINISHED") {
    return "Results";
  }

  return "Live";
}

function isScoreVisible(fixture) {
  return fixture.status !== "SCHEDULED" && Number.isFinite(fixture.resultSnapshot?.homeScore);
}

function normalizeTeamKey(team) {
  return String(team?.name || team?.shortName || "")
    .trim()
    .toLowerCase();
}

function hashText(value) {
  return [...String(value || "")].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function getTeamPalette(team) {
  const key = normalizeTeamKey(team);

  if (TEAM_PALETTE_OVERRIDES[key]) {
    return TEAM_PALETTE_OVERRIDES[key];
  }

  return TEAM_PALETTE_FALLBACKS[hashText(key) % TEAM_PALETTE_FALLBACKS.length];
}

function getTeamBadgeText(team) {
  const shortName = String(team?.shortName || "").trim();
  if (shortName) {
    return shortName.slice(0, 3).toUpperCase();
  }

  return String(team?.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getTeamStyle(team) {
  const palette = getTeamPalette(team);

  return {
    "--team-accent": palette.accent,
    "--team-accent-soft": palette.soft,
    "--team-accent-contrast": palette.contrast,
  };
}

function TeamBadge({ team }) {
  const teamStyle = getTeamStyle(team);

  return (
    <span className={styles.teamBadge} style={teamStyle} aria-hidden="true">
      <span className={styles.teamBadgeInner}>{getTeamBadgeText(team)}</span>
    </span>
  );
}

function buildStateLabel(fixture) {
  if (fixture.status === "LIVE") {
    return "Live";
  }

  if (fixture.status === "FINISHED") {
    return "Final";
  }

  return "Kickoff";
}

function buildScorelineText(fixture) {
  if (isScoreVisible(fixture)) {
    return `${fixture.resultSnapshot.homeScore} - ${fixture.resultSnapshot.awayScore}`;
  }

  return "VS";
}

export function MatchRow({ fixture, locale }) {
  const statusClassName =
    fixture.status === "LIVE"
      ? styles.statusLive
      : fixture.status === "FINISHED"
        ? styles.statusFinished
        : styles.statusChip;
  const homeStyle = getTeamStyle(fixture.homeTeam);
  const awayStyle = getTeamStyle(fixture.awayTeam);

  return (
    <article className={styles.matchRow}>
      <Link href={buildMatchHref(locale, fixture)} className={styles.matchRowMain}>
        <div className={styles.matchRowCard}>
          <div className={`${styles.teamSide} ${styles.teamSideHome}`} style={homeStyle}>
            <TeamBadge team={fixture.homeTeam} />
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.homeTeam.name}</span>
            </div>
          </div>

          <div className={styles.scoreColumn}>
            <strong className={styles.scoreline}>{buildScorelineText(fixture)}</strong>
            <span className={styles.scoreMeta}>{fixture.round || fixture.league.name}</span>
          </div>

          <div className={`${styles.teamSide} ${styles.teamSideAway}`} style={awayStyle}>
            <TeamBadge team={fixture.awayTeam} />
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.awayTeam.name}</span>
            </div>
          </div>

          <div className={styles.matchRowState}>
            <div className={styles.stateStack}>
              <span className={statusClassName}>{buildStateLabel(fixture)}</span>
              <span className={styles.stateValue}>{buildMatchStatusLabel(fixture, locale)}</span>
            </div>
            <span className={styles.matchRowMeta}>{buildMatchTimeLabel(fixture, locale)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function Scoreboard({ locale, title, lead, feed }) {
  const selectedDateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(new Date(feed.selectedDate));
  const currentFilters = {
    date: feed.selectedDate,
    q: feed.query,
    league: feed.selectedLeague,
    time: feed.selectedTime,
  };
  const refreshLabel = feed.refresh?.enabled ? "Auto-refresh on" : "Waiting for live matches";
  const summaryCards = [
    { key: "ALL", count: feed.summary.total },
    { key: "LIVE", count: feed.summary.LIVE },
    { key: "SCHEDULED", count: feed.summary.SCHEDULED },
    { key: "FINISHED", count: feed.summary.FINISHED },
  ];

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={feed.refresh?.enabled}
        intervalMs={feed.refresh?.intervalMs}
        until={feed.refresh?.until}
      />

      <header className={styles.boardHeader}>
        <div className={styles.boardIntro}>
          <p className={styles.eyebrow}>Match board</p>
          <h1 className={styles.title}>{title}</h1>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
        </div>

        <div className={styles.headerMeta}>
          <span className={styles.metaChip}>{selectedDateLabel}</span>
          <span className={styles.metaChip}>{feed.summary.total} matches</span>
          <span className={styles.metaChip}>{refreshLabel}</span>
        </div>
      </header>

      <section className={styles.toolbar}>
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
          <span className={styles.datePill}>{selectedDateLabel}</span>
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

        <form action={`/${locale}`} className={styles.refineGrid}>
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
        {summaryCards.map((entry) => (
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
                  <span>{group.summary.SCHEDULED || 0} fixtures</span>
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
