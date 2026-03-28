"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./scoreboard.module.css";

function buildNextQuery(searchParams, nextValues) {
  const params = new URLSearchParams(searchParams.toString());

  params.set("preset", "custom");
  params.set("startTime", "00:00");
  params.set("endTime", "23:59");
  params.delete("date");

  if (nextValues.startDate) {
    params.set("startDate", nextValues.startDate);
  } else {
    params.delete("startDate");
  }

  if (nextValues.endDate) {
    params.set("endDate", nextValues.endDate);
  } else {
    params.delete("endDate");
  }

  return params.toString();
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 2.6v2.3M11 2.6v2.3M2.8 6h10.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function DateRangeControls({
  locale,
  selectedStartDate,
  selectedEndDate,
  fromDayLabel,
  toDayLabel,
  showReset = false,
  rangeResetHref = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleDateChange(key, value) {
    const queryString = buildNextQuery(searchParams, {
      startDate: key === "startDate" ? value : selectedStartDate,
      endDate: key === "endDate" ? value : selectedEndDate,
    });

    router.push(queryString ? `${pathname || `/${locale}`}?${queryString}` : pathname || `/${locale}`);
  }

  return (
    <div className={styles.dateRangeControls}>
      <label className={`${styles.dateRangeField} ${styles.dateRangeFieldInline}`}>
        <span className={styles.dateFieldHeader}>
          <span className={styles.dateFieldEyebrow}>From</span>
          <span className={styles.dateFieldMeta}>
            <span className={styles.dateFieldIcon}>
              <CalendarIcon />
            </span>
            <span>{fromDayLabel}</span>
          </span>
        </span>
        <span className={styles.srOnly}>From</span>
        <input
          type="date"
          name="startDate"
          defaultValue={selectedStartDate}
          className={`${styles.searchInput} ${styles.dateRangeInput}`}
          aria-label="Start date"
          onChange={(event) => handleDateChange("startDate", event.currentTarget.value)}
        />
      </label>

      <label className={`${styles.dateRangeField} ${styles.dateRangeFieldInline}`}>
        <span className={styles.dateFieldHeader}>
          <span className={styles.dateFieldEyebrow}>To</span>
          <span className={styles.dateFieldMeta}>
            <span className={styles.dateFieldIcon}>
              <CalendarIcon />
            </span>
            <span>{toDayLabel}</span>
          </span>
        </span>
        <span className={styles.srOnly}>To</span>
        <input
          type="date"
          name="endDate"
          defaultValue={selectedEndDate}
          className={`${styles.searchInput} ${styles.dateRangeInput}`}
          aria-label="End date"
          onChange={(event) => handleDateChange("endDate", event.currentTarget.value)}
        />
      </label>

      {showReset ? (
        <a href={rangeResetHref} className={`${styles.rangeResetLink} ${styles.dateRangeResetDesktop}`}>
          Reset
        </a>
      ) : null}
    </div>
  );
}
