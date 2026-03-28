import Link from "next/link";
import { buildMatchStatusLabel } from "../../lib/coreui/match-data";
import { buildMatchBoardHref } from "../../lib/coreui/minimal-routes";
import { buildCompetitionHref, buildMatchHref, buildTeamHref } from "../../lib/coreui/routes";
import { LeagueFilterDropdown } from "./league-filter-dropdown";
import { LiveRefresh } from "./live-refresh";
import styles from "./scoreboard.module.css";
import { TeamBadge } from "./team-badge";

const META_SEPARATOR = " \u00b7 ";

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

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function hasFullDayWindow(feed) {
  return feed.selectedStartTime === "00:00" && feed.selectedEndTime === "23:59";
}

function buildRangeLabel(feed, locale) {
  const start = new Date(feed.rangeStart);
  const end = new Date(feed.rangeEnd);
  const fullDayWindow = hasFullDayWindow(feed);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return feed.selectedPresetLabel;
  }

  if (isSameDay(start, end) && fullDayWindow) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "long",
      day: "numeric",
    }).format(start);
  }

  if (isSameDay(start, end)) {
    const dayFormatter = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dayFormatter.format(start)} | ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  if (fullDayWindow && isSameMonth(start, end)) {
    const boundaryFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    });

    return `${boundaryFormatter.format(start)} - ${boundaryFormatter.format(end)}`;
  }

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateTimeFormatter.format(start)} - ${dateTimeFormatter.format(end)}`;
}

function buildTimeGroupMeta(group) {
  const leagueLabel =
    group.leagueCount === 1 ? group.leagueNames[0] : `${group.leagueCount} leagues`;
  const matchLabel = `${group.fixtureCount} ${group.fixtureCount === 1 ? "match" : "matches"}`;

  return `${leagueLabel} · ${matchLabel}`;
}

function buildRangeQuery(feed) {
  if (feed.selectedPreset && feed.selectedPreset !== "custom") {
    return {
      preset: feed.selectedPreset === "today" ? "" : feed.selectedPreset,
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      date: "",
    };
  }

  return {
    preset: "custom",
    startDate: feed.selectedStartDate,
    startTime: feed.selectedStartTime,
    endDate: feed.selectedEndDate,
    endTime: feed.selectedEndTime,
    date: "",
  };
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

function getTeamStyle(team) {
  const palette = getTeamPalette(team);

  return {
    "--team-accent": palette.accent,
    "--team-accent-soft": palette.soft,
    "--team-accent-contrast": palette.contrast,
  };
}

function buildScorelineText(fixture) {
  if (isScoreVisible(fixture)) {
    return `${fixture.resultSnapshot.homeScore} - ${fixture.resultSnapshot.awayScore}`;
  }

  return "VS";
}

function buildMatchCardDateLabel(fixture, locale) {
  const kickoff = new Date(fixture.startsAt);

  if (Number.isNaN(kickoff.getTime())) {
    return "";
  }

  const formatOptions =
    kickoff.getFullYear() === new Date().getFullYear()
      ? { month: "short", day: "numeric" }
      : { year: "numeric", month: "short", day: "numeric" };

  return new Intl.DateTimeFormat(locale, formatOptions).format(kickoff);
}

function buildKickoffCardLabel(fixture, locale) {
  const kickoff = new Date(fixture.startsAt);

  if (Number.isNaN(kickoff.getTime())) {
    return { primary: "", suffix: "" };
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(kickoff);
  const match = /^(.*?)(?:\s([A-Za-z]{2}))?$/.exec(formatted.trim());

  return {
    primary: match?.[1] || formatted,
    suffix: match?.[2] || "",
  };
}

function getTeamResultTone(fixture, side) {
  const score = fixture.resultSnapshot;

  if (!isScoreVisible(fixture) || !score) {
    return "neutral";
  }

  if (score.homeScore === score.awayScore) {
    return "draw";
  }

  const isHomeWinner = score.homeScore > score.awayScore;

  if (side === "home") {
    return isHomeWinner ? "winner" : "loser";
  }

  return isHomeWinner ? "loser" : "winner";
}

export function MatchRow({ fixture, locale }) {
  const homeStyle = getTeamStyle(fixture.homeTeam);
  const awayStyle = getTeamStyle(fixture.awayTeam);
  const matchDateLabel = buildMatchCardDateLabel(fixture, locale);
  const kickoffLabel = buildKickoffCardLabel(fixture, locale);
  const matchHref = buildMatchHref(locale, fixture);
  const leagueHref = buildCompetitionHref(locale, fixture.league);
  const matchStatusLabel = fixture.status === "SCHEDULED" ? "" : buildMatchStatusLabel(fixture, locale);
  const homeTone = getTeamResultTone(fixture, "home");
  const awayTone = getTeamResultTone(fixture, "away");
  const matchStatusClassName =
    fixture.status === "LIVE"
      ? `${styles.matchStatusPill} ${styles.matchStatusPillLive}`
      : `${styles.matchStatusPill} ${styles.matchStatusPillFinished}`;
  const homeTeamClassName = [
    styles.teamSide,
    styles.teamSideHome,
    homeTone === "winner" ? styles.teamSideWinner : "",
    homeTone === "loser" ? styles.teamSideLoser : "",
    homeTone === "draw" ? styles.teamSideDraw : "",
  ].filter(Boolean).join(" ");
  const awayTeamClassName = [
    styles.teamSide,
    styles.teamSideAway,
    awayTone === "winner" ? styles.teamSideWinner : "",
    awayTone === "loser" ? styles.teamSideLoser : "",
    awayTone === "draw" ? styles.teamSideDraw : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={styles.matchRow}>
      <div className={styles.matchRowCard}>
        <div className={styles.matchRowHeader}>
          <Link
            href={leagueHref}
            className={styles.matchLeagueLink}
            aria-label={`${fixture.league.name} league page`}
          >
            <span className={styles.matchLeague}>{fixture.league.name}</span>
          </Link>
          {matchStatusLabel ? (
            <Link
              href={matchHref}
              className={styles.matchStatusLink}
              aria-label={`${fixture.homeTeam.name} vs ${fixture.awayTeam.name} match details`}
            >
              <span className={matchStatusClassName}>{matchStatusLabel}</span>
            </Link>
          ) : null}
        </div>

        <div className={styles.matchRowMain}>
          <Link
            href={buildTeamHref(locale, fixture.homeTeam)}
            className={homeTeamClassName}
            aria-label={`${fixture.homeTeam.name} team details`}
          >
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.homeTeam.name}</span>
            </div>
            <TeamBadge team={fixture.homeTeam} teamStyle={homeStyle} />
          </Link>

          <Link
            href={matchHref}
            className={styles.matchCenterLink}
            aria-label={`${fixture.homeTeam.name} vs ${fixture.awayTeam.name} match details`}
          >
            <span className={styles.matchCenterMeta}>
              {kickoffLabel.primary ? (
                <span className={styles.kickoffInline}>
                  <span className={styles.kickoffPrimary}>{kickoffLabel.primary}</span>
                  {kickoffLabel.suffix ? <span className={styles.kickoffSuffix}>{kickoffLabel.suffix}</span> : null}
                </span>
              ) : null}
              {matchDateLabel ? <span className={styles.matchDate}>{matchDateLabel}</span> : null}
            </span>

            {isScoreVisible(fixture) ? (
              <strong className={styles.scoreline}>{buildScorelineText(fixture)}</strong>
            ) : (
              <span className={styles.fixturePlaceholder}>vs</span>
            )}
          </Link>

          <Link
            href={buildTeamHref(locale, fixture.awayTeam)}
            className={awayTeamClassName}
            aria-label={`${fixture.awayTeam.name} team details`}
          >
            <TeamBadge team={fixture.awayTeam} teamStyle={awayStyle} />
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.awayTeam.name}</span>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Scoreboard({ locale, feed }) {
  const selectedRangeLabel = buildRangeLabel(feed, locale);
  const rangeQuery = buildRangeQuery(feed);
  const liveCount = feed.summary.LIVE || 0;
  const currentFilters = {
    ...rangeQuery,
    league: feed.selectedLeague,
    status: feed.selectedStatus === "ALL" ? "" : feed.selectedStatus.toLowerCase(),
  };
  const hasLeagueFilter = Boolean(
    feed.selectedLeague && String(feed.selectedLeague).toLowerCase() !== "all"
  );
  const selectedLeagueLabel =
    feed.leagueOptions.find((option) => option.code === feed.selectedLeague)?.name || "All leagues";
  const toolbarSummary = [
    `${feed.summary.total} matches`,
    liveCount ? `${liveCount} live` : null,
    hasLeagueFilter ? selectedLeagueLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const compactToolbarSummary = toolbarSummary.replaceAll("\u00c2\u00b7", META_SEPARATOR.trim());
  const rangeResetHref = buildMatchBoardHref(
    locale,
    {
      league: feed.selectedLeague,
      status: currentFilters.status,
    },
    {
      preset: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      date: "",
    }
  );

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={feed.refresh?.enabled}
        intervalMs={feed.refresh?.intervalMs}
        until={feed.refresh?.until}
      />

      <section className={styles.toolbar}>
        <div className={styles.toolbarBar}>
          <div className={styles.dateRail}>
            <Link
              href={buildMatchBoardHref(locale, currentFilters, feed.rangeNavigation.previous)}
              className={styles.commandButton}
            >
              Prev
            </Link>
            <span className={styles.datePill}>
              <span className={styles.datePillPrimary}>{selectedRangeLabel}</span>
              <span className={styles.datePillMeta}>{compactToolbarSummary}</span>
            </span>
            <Link
              href={buildMatchBoardHref(locale, currentFilters, feed.rangeNavigation.next)}
              className={styles.commandButton}
            >
              Next
            </Link>
          </div>

          <div className={styles.toolbarActions}>
            <LeagueFilterDropdown
              locale={locale}
              currentFilters={{ ...currentFilters, totalMatches: feed.summary.total }}
              options={feed.leagueOptions}
              selectedLeague={feed.selectedLeague}
            />
          </div>

          <form action={`/${locale}`} className={styles.dateRangeForm}>
            {currentFilters.status ? <input type="hidden" name="status" value={currentFilters.status} /> : null}
            {hasLeagueFilter ? <input type="hidden" name="league" value={feed.selectedLeague} /> : null}
            <input type="hidden" name="preset" value="custom" />
            <input type="hidden" name="startTime" value="00:00" />
            <input type="hidden" name="endTime" value="23:59" />

            <label className={styles.dateRangeField}>
              <span className={styles.srOnly}>From</span>
              <input
                type="date"
                name="startDate"
                defaultValue={feed.selectedStartDate}
                className={`${styles.searchInput} ${styles.dateRangeInput}`}
                aria-label="Start date"
              />
            </label>

            <label className={styles.dateRangeField}>
              <span className={styles.srOnly}>To</span>
              <input
                type="date"
                name="endDate"
                defaultValue={feed.selectedEndDate}
                className={`${styles.searchInput} ${styles.dateRangeInput}`}
                aria-label="End date"
              />
            </label>

            <button type="submit" className={`${styles.searchSubmit} ${styles.compactActionButton} ${feed.rangeIsDefault ? styles.fullWidthAction : ""}`}>
              Apply
            </button>

            {!feed.rangeIsDefault ? (
              <Link href={rangeResetHref} className={`${styles.rangeResetLink} ${styles.compactActionButton}`}>
                Reset
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      <div className={styles.groupStack}>
        {feed.fixtures.length ? (
          <section className={styles.groupCard}>
            <div className={styles.matchList}>
              {feed.fixtures.map((fixture) => (
                <MatchRow key={fixture.id} fixture={fixture} locale={locale} />
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.emptyState}>
            No matches fit this date range right now. Try another span or switch leagues.
          </div>
        )}
      </div>
    </section>
  );
}
