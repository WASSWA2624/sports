"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./competition-pages.module.css";

function getSearchText(league) {
  return [league.name, league.country, league.code, league.season].filter(Boolean).join(" ").toLowerCase();
}

export function LeaguesDirectorySearch({ locale, leagues = [] }) {
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearch = searchValue.trim().toLowerCase();

  const visibleLeagues = useMemo(() => {
    if (!normalizedSearch) {
      return leagues;
    }

    return leagues.filter((league) => getSearchText(league).includes(normalizedSearch));
  }, [leagues, normalizedSearch]);

  return (
    <section className={styles.directorySearchSection}>
      <div className={styles.directorySearchHeader}>
        <div>
          <p className={styles.eyebrow}>Global search</p>
          <h2 className={styles.sectionTitle}>Find any competition instantly</h2>
        </div>
        <span className={styles.badge}>
          {visibleLeagues.length} {visibleLeagues.length === 1 ? "league" : "leagues"}
        </span>
      </div>

      <label className={styles.directorySearchField}>
        <span className={styles.directorySearchIcon} aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m12.6 12.6 4.1 4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className={styles.srOnly}>Search football leagues</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          className={styles.directorySearchInput}
          placeholder="Search by league, country, code, or season"
          autoComplete="off"
        />
      </label>

      {visibleLeagues.length ? (
        <div className={styles.directoryGrid}>
          {visibleLeagues.map((league) => (
            <Link key={league.code} href={`/${locale}/leagues/${league.code}`} className={styles.directoryCard}>
              <div className={styles.directoryCardTop}>
                <div className={styles.directoryCardMark} aria-hidden="true">
                  {league.code.slice(0, 2)}
                </div>
                <div className={styles.directoryCardLead}>
                  <p className={styles.eyebrow}>{league.country}</p>
                  <h2 className={styles.cardTitle}>{league.name}</h2>
                  <div className={styles.directoryCardInlineMeta}>
                    <p className={styles.cardMeta}>
                      {league.teams.length} teams / {league.fixtures.length} matches
                    </p>
                    <div className={styles.directoryCardStats}>
                      <span className={styles.badge}>{league.season}</span>
                      <span className={styles.badge}>{league.code}</span>
                    </div>
                  </div>
                </div>
                <span className={styles.directoryCardArrow} aria-hidden="true">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No leagues match <strong>{searchValue}</strong>. Try a country, code, or competition name.
        </div>
      )}
    </section>
  );
}
