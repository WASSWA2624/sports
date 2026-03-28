"use client";

import Link from "next/link";
import { DateRangeControls } from "./date-range-controls";
import { LeagueFilterDropdown } from "./league-filter-dropdown";
import styles from "./scoreboard.module.css";

function ArrowIcon({ direction = "left" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {direction === "right" ? (
        <path
          d="M6.2 3.2 10.8 8l-4.6 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M9.8 3.2 5.2 8l4.6 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function MobileMatchdayToolbar({
  locale,
  currentFilters,
  rangeNavigation,
  selectedStartDate,
  selectedEndDate,
  startDateChipLabel,
  endDateChipLabel,
  totalMatches,
  leagueOptions,
  selectedLeague,
}) {
  return (
    <div className={styles.mobileToolbarRow}>
      <Link
        href={buildMobileNavHref(locale, currentFilters, rangeNavigation.previous)}
        className={styles.mobileNavButton}
        aria-label="Previous range"
      >
        <ArrowIcon direction="left" />
      </Link>

      <Link
        href={buildMobileNavHref(locale, currentFilters, rangeNavigation.next)}
        className={styles.mobileNavButton}
        aria-label="Next range"
      >
        <ArrowIcon direction="right" />
      </Link>

      <div className={styles.mobileToolbarLeague}>
        <LeagueFilterDropdown
          locale={locale}
          currentFilters={{ ...currentFilters, totalMatches }}
          options={leagueOptions}
          selectedLeague={selectedLeague}
          compactMobile
        />
      </div>

      <div className={styles.mobileToolbarDates}>
        <DateRangeControls
          locale={locale}
          selectedStartDate={selectedStartDate}
          selectedEndDate={selectedEndDate}
          startDateChipLabel={startDateChipLabel}
          endDateChipLabel={endDateChipLabel}
          mobileInline
        />
      </div>
    </div>
  );
}

function buildMobileNavHref(locale, currentFilters, rangeParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({
    ...currentFilters,
    ...rangeParams,
  })) {
    if (value) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `/${locale}?${queryString}` : `/${locale}`;
}
