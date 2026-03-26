import Link from "next/link";
import { buildMatchStatusLabel } from "../../lib/coreui/match-data";
import { buildMatchBoardHref } from "../../lib/coreui/minimal-routes";
import { buildMatchHref } from "../../lib/coreui/routes";
import { LiveRefresh } from "./live-refresh";
import styles from "./scoreboard.module.css";
import { TeamBadge } from "./team-badge";

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

function buildRangeModeLabel(feed) {
  if (feed.selectedPreset !== "custom") {
    return feed.selectedPresetLabel;
  }

  return hasFullDayWindow(feed) ? "Custom date range" : "Custom date-time range";
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

function buildGroupSummaryItems(summary) {
  return [
    summary.LIVE ? { key: "live", label: `${summary.LIVE} live` } : null,
    summary.SCHEDULED ? { key: "scheduled", label: `${summary.SCHEDULED} fixtures` } : null,
    summary.FINISHED ? { key: "finished", label: `${summary.FINISHED} results` } : null,
  ].filter(Boolean);
}

export function MatchRow({ fixture, locale }) {
  const matchStateClassName =
    fixture.status === "LIVE"
      ? `${styles.matchState} ${styles.matchStateLive}`
      : fixture.status === "FINISHED"
        ? `${styles.matchState} ${styles.matchStateFinished}`
        : styles.matchState;
  const homeStyle = getTeamStyle(fixture.homeTeam);
  const awayStyle = getTeamStyle(fixture.awayTeam);

  return (
    <article className={styles.matchRow}>
      <Link href={buildMatchHref(locale, fixture)} className={styles.matchRowMain}>
        <div className={styles.matchRowCard}>
          <div className={styles.teamSide} style={homeStyle}>
            <TeamBadge team={fixture.homeTeam} teamStyle={homeStyle} />
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.homeTeam.name}</span>
            </div>
          </div>

          <div className={styles.matchCenter}>
            <strong className={styles.scoreline}>{buildScorelineText(fixture)}</strong>
            <span className={matchStateClassName}>{buildMatchStatusLabel(fixture, locale)}</span>
          </div>

          <div className={`${styles.teamSide} ${styles.teamSideAway}`} style={awayStyle}>
            <div className={styles.teamCopy}>
              <span className={styles.teamName}>{fixture.awayTeam.name}</span>
            </div>
            <TeamBadge team={fixture.awayTeam} teamStyle={awayStyle} />
          </div>
        </div>
      </Link>
    </article>
  );
}

export function Scoreboard({ locale, feed }) {
  const selectedRangeLabel = buildRangeLabel(feed, locale);
  const rangeQuery = buildRangeQuery(feed);
  const currentFilters = {
    ...rangeQuery,
    q: feed.query,
    league: feed.selectedLeague,
    time: feed.selectedTime,
    status: feed.selectedStatus === "ALL" ? "" : feed.selectedStatus.toLowerCase(),
  };
  const hasLeagueFilter = Boolean(
    feed.selectedLeague && String(feed.selectedLeague).toLowerCase() !== "all"
  );
  const hasTimeFilter = Boolean(feed.selectedTime && String(feed.selectedTime).toLowerCase() !== "all");
  const rangeFilterActive = !feed.rangeIsDefault;
  const activeFilterCount = [
    rangeFilterActive,
    Boolean(feed.query),
    hasLeagueFilter,
    hasTimeFilter,
  ].filter(Boolean).length;
  const hasRefinements = activeFilterCount > 0;
  const metaChips = [
    { key: "window", label: buildRangeModeLabel(feed) },
    { key: "matches", label: `${feed.summary.total} matches` },
    ...(feed.refresh?.enabled ? [{ key: "refresh", label: "Live refresh" }] : []),
    ...(hasRefinements ? [{ key: "filters", label: `${activeFilterCount} filters` }] : []),
  ];

  return (
    <section className={styles.page}>
      <LiveRefresh
        enabled={feed.refresh?.enabled}
        intervalMs={feed.refresh?.intervalMs}
        until={feed.refresh?.until}
      />

      <section className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <div className={styles.dateRail}>
            <Link
              href={buildMatchBoardHref(locale, currentFilters, feed.rangeNavigation.previous)}
              className={styles.commandButton}
            >
              Prev
            </Link>
            <span className={styles.datePill}>{selectedRangeLabel}</span>
            <Link
              href={buildMatchBoardHref(locale, currentFilters, feed.rangeNavigation.next)}
              className={styles.commandButton}
            >
              Next
            </Link>
          </div>

          <div className={styles.headerMeta}>
            {metaChips.map((item) => (
              <span key={item.key} className={styles.metaChip}>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.filterRail}>
          {feed.statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildMatchBoardHref(locale, currentFilters, { status: option.value.toLowerCase() })}
              className={option.value === feed.selectedStatus ? styles.filterChipActive : styles.filterChip}
            >
              <span>{statusLabel(option.value)}</span>
              <strong>{option.count}</strong>
            </Link>
          ))}
        </div>

        <div className={styles.presetRail}>
          {feed.quickPresetOptions.map((option) => (
            <Link
              key={option.value}
              href={buildMatchBoardHref(
                locale,
                currentFilters,
                {
                  preset: option.value,
                  startDate: "",
                  startTime: "",
                  endDate: "",
                  endTime: "",
                  date: "",
                }
              )}
              className={option.value === feed.selectedPreset ? styles.filterChipActive : styles.filterChip}
            >
              <span>{option.label}</span>
            </Link>
          ))}
        </div>

        <details className={styles.refinePanel} open={hasRefinements}>
          <summary className={styles.refineToggle}>
            <span>Refine</span>
            <strong>{hasRefinements ? `${activeFilterCount} active` : "Optional"}</strong>
          </summary>

          <form action={`/${locale}`} className={styles.refineGrid}>
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

            <label className={styles.searchField}>
              <span className={styles.searchLabel}>Preset</span>
              <select name="preset" defaultValue={feed.selectedPreset} className={styles.searchInput}>
                {feed.presetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className={styles.fieldHint}>Quick ranges and exact start/end boundaries can work together.</span>
            </label>

            <div className={styles.rangeFields}>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Start date</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={feed.selectedStartDate}
                  className={styles.searchInput}
                />
              </label>

              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Start time</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue={feed.selectedStartTime}
                  className={styles.searchInput}
                />
              </label>

              <label className={styles.searchField}>
                <span className={styles.searchLabel}>End date</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={feed.selectedEndDate}
                  className={styles.searchInput}
                />
              </label>

              <label className={styles.searchField}>
                <span className={styles.searchLabel}>End time</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue={feed.selectedEndTime}
                  className={styles.searchInput}
                />
              </label>
            </div>

            <button type="submit" className={styles.searchSubmit}>
              Apply
            </button>
          </form>
        </details>
      </section>

      <div className={styles.groupStack}>
        {feed.groups.length ? (
          feed.groups.map((group) => {
            const groupSummaryItems = buildGroupSummaryItems(group.summary);

            return (
              <section key={group.key} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupHeading}>
                    <p className={styles.groupCountry}>{group.country}</p>
                    <h2 className={styles.groupTitle}>
                      <Link href={`/${locale}/leagues/${group.leagueCode}`}>{group.leagueName}</Link>
                    </h2>
                  </div>

                  {groupSummaryItems.length ? (
                    <div className={styles.groupSummary}>
                      {groupSummaryItems.map((item) => (
                        <span key={item.key}>{item.label}</span>
                      ))}
                    </div>
                  ) : null}
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
          <div className={styles.emptyState}>
            No matches match this search. Try another date-time range, preset window, league, or kickoff bucket.
          </div>
        )}
      </div>
    </section>
  );
}
